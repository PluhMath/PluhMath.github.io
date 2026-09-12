
class Button extends Tiny.Sprite {
  constructor (image, pressImage , callback) {

    var textrue = Tiny.TextureCache[image];
    super(textrue);

    this._callback = callback;

    this.setEventEnabled(true);
    var self = this;

    this.mousedown = this.touchstart = function () {
      self.texture = Tiny.Texture.fromImage(pressImage);
    };

    this.mouseup = this.mouseupoutside = this.touchend = this.touchendoutside = function () {
      self.texture = Tiny.Texture.fromImage(image);
    };

    this.mouseup = this.tap = function () {
      if (Tiny.isFunction(self._callback)) {
        self._callback();
      }
    };

  }
}
export default Button;
