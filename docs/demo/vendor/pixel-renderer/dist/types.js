export class PixelRendererError extends Error {
    code;
    constructor(code, message) {
        super(message);
        this.name = "PixelRendererError";
        this.code = code;
    }
}
//# sourceMappingURL=types.js.map