.PHONY: test-pixel-renderer make-sjis-bmp help

help:
	@echo "Available targets:"
	@echo "  test-pixel-renderer   Build + test packages/pixel-renderer"
	@echo "  make-sjis-bmp         Generate SJIS bmp.gz atlas from TTF"
	@echo "\nUsage example:"
	@echo "  make make-sjis-bmp FONT=/path/to/khdotfont.ttf OUT=./kh16akihabara.bmp.gz"

test-pixel-renderer:
	npm --prefix packages/pixel-renderer test

make-sjis-bmp:
	@if [ -z "$(FONT)" ] || [ -z "$(OUT)" ]; then \
		echo "Usage: make make-sjis-bmp FONT=/path/to/font.ttf OUT=./font.bmp.gz [GLYPH_WIDTH=16] [GLYPH_HEIGHT=16] [FONT_SIZE=16] [OFFSET_Y=0]"; \
		exit 1; \
	fi
	python packages/make-sjis-bmp-from-ttf/make_sjis_bmp_from_ttf.py \
		"$(FONT)" \
		--out "$(OUT)" \
		--glyph-width "$(or $(GLYPH_WIDTH),16)" \
		--glyph-height "$(or $(GLYPH_HEIGHT),16)" \
		--font-size "$(or $(FONT_SIZE),16)" \
		--offset-y "$(or $(OFFSET_Y),0)"
