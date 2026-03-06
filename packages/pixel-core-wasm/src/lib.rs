use wasm_bindgen::prelude::*;

const CHANNELS: usize = 4;

fn rgba_len(width: u32, height: u32) -> usize {
    width as usize * height as usize * CHANNELS
}

fn assert_rgba(buf: &[u8], width: u32, height: u32) -> Result<(), JsValue> {
    let expected = rgba_len(width, height);
    if buf.len() != expected {
        return Err(JsValue::from_str("rgba length mismatch"));
    }
    Ok(())
}

fn blend(dst: &mut [u8], idx: usize, sr: u8, sg: u8, sb: u8, sa: f32) {
    if sa <= 0.0 {
        return;
    }

    let da = dst[idx + 3] as f32 / 255.0;
    let out_a = sa + da * (1.0 - sa);
    if out_a <= 0.0 {
        return;
    }

    dst[idx] = (((sr as f32 * sa) + (dst[idx] as f32 * da * (1.0 - sa))) / out_a)
        .round()
        .clamp(0.0, 255.0) as u8;
    dst[idx + 1] = (((sg as f32 * sa) + (dst[idx + 1] as f32 * da * (1.0 - sa))) / out_a)
        .round()
        .clamp(0.0, 255.0) as u8;
    dst[idx + 2] = (((sb as f32 * sa) + (dst[idx + 2] as f32 * da * (1.0 - sa))) / out_a)
        .round()
        .clamp(0.0, 255.0) as u8;
    dst[idx + 3] = (out_a * 255.0).round().clamp(0.0, 255.0) as u8;
}

fn split_sjis_code(code: u16) -> (u32, u32) {
    // Spec: 1-byte codes are zero-padded and stored as 0x00xx.
    if code <= 0x00FF {
        return (0, (code & 0x00FF) as u32);
    }
    (((code >> 8) & 0x00FF) as u32, (code & 0x00FF) as u32)
}

#[wasm_bindgen]
pub fn create_canvas(width: u32, height: u32, r: u8, g: u8, b: u8) -> Vec<u8> {
    let mut out = vec![0; rgba_len(width, height)];
    for i in (0..out.len()).step_by(CHANNELS) {
        out[i] = r;
        out[i + 1] = g;
        out[i + 2] = b;
        out[i + 3] = 255;
    }
    out
}

#[wasm_bindgen]
pub fn blit_scaled_rgba(
    base: &[u8],
    base_width: u32,
    base_height: u32,
    src: &[u8],
    src_width: u32,
    src_height: u32,
    x: i32,
    y: i32,
    scale: u32,
) -> Result<Vec<u8>, JsValue> {
    if scale == 0 {
        return Err(JsValue::from_str("scale must be >= 1"));
    }

    assert_rgba(base, base_width, base_height)?;
    assert_rgba(src, src_width, src_height)?;

    let mut out = base.to_vec();

    for sy in 0..src_height as i32 {
        for sx in 0..src_width as i32 {
            let si = ((sy as u32 * src_width + sx as u32) as usize) * CHANNELS;
            let sa = src[si + 3] as f32 / 255.0;
            if sa <= 0.0 {
                continue;
            }

            for oy in 0..scale as i32 {
                let dy = y + sy * scale as i32 + oy;
                if dy < 0 || dy >= base_height as i32 {
                    continue;
                }
                for ox in 0..scale as i32 {
                    let dx = x + sx * scale as i32 + ox;
                    if dx < 0 || dx >= base_width as i32 {
                        continue;
                    }

                    let di = ((dy as u32 * base_width + dx as u32) as usize) * CHANNELS;
                    blend(&mut out, di, src[si], src[si + 1], src[si + 2], sa);
                }
            }
        }
    }

    Ok(out)
}

#[wasm_bindgen]
pub fn draw_sjis_text_1bit(
    base: &[u8],
    base_width: u32,
    base_height: u32,
    atlas_1bit: &[u8],
    glyph_width: u32,
    glyph_height: u32,
    bit_order_msb: bool,
    codes: &[u16],
    x: i32,
    y: i32,
    scale: u32,
    r: u8,
    g: u8,
    b: u8,
) -> Result<Vec<u8>, JsValue> {
    if scale == 0 {
        return Err(JsValue::from_str("scale must be >= 1"));
    }

    assert_rgba(base, base_width, base_height)?;

    let atlas_w = 256 * glyph_width;
    let atlas_h = 256 * glyph_height;
    let expected_bits = atlas_w as usize * atlas_h as usize;
    let expected_bytes = (expected_bits + 7) / 8;
    if atlas_1bit.len() < expected_bytes {
        return Err(JsValue::from_str("atlas 1bit buffer is too short"));
    }

    let mut out = base.to_vec();
    let mut pen_x = x;
    let mut pen_y = y;

    for code in codes {
        if *code == 0x000A {
            pen_x = x;
            pen_y += (glyph_height * scale) as i32;
            continue;
        }

        let (high, low) = split_sjis_code(*code);
        let gx = low * glyph_width;
        let gy = high * glyph_height;

        for py in 0..glyph_height as i32 {
            for px in 0..glyph_width as i32 {
                let atlas_x = gx as i32 + px;
                let atlas_y = gy as i32 + py;
                let bit_index = atlas_y as usize * atlas_w as usize + atlas_x as usize;
                let byte_index = bit_index >> 3;
                let bit_in_byte = if bit_order_msb {
                    7 - (bit_index & 7)
                } else {
                    bit_index & 7
                };
                let bit = (atlas_1bit[byte_index] >> bit_in_byte) & 1;
                if bit == 0 {
                    continue;
                }

                for oy in 0..scale as i32 {
                    let dy = pen_y + py * scale as i32 + oy;
                    if dy < 0 || dy >= base_height as i32 {
                        continue;
                    }
                    for ox in 0..scale as i32 {
                        let dx = pen_x + px * scale as i32 + ox;
                        if dx < 0 || dx >= base_width as i32 {
                            continue;
                        }

                        let di = ((dy as u32 * base_width + dx as u32) as usize) * CHANNELS;
                        out[di] = r;
                        out[di + 1] = g;
                        out[di + 2] = b;
                        out[di + 3] = 255;
                    }
                }
            }
        }

        pen_x += (glyph_width * scale) as i32;
    }

    Ok(out)
}

#[wasm_bindgen]
pub fn version() -> String {
    "0.1.0".to_string()
}
