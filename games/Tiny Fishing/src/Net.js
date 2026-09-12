import RESOURCES from './Resource';

class Net extends Tiny.Sprite {
  constructor(parent) {
    var texture = Tiny.Texture.fromImage(RESOURCES['s_web' + parent.currentPower + '_png']);
    super(texture);
    this._parent = parent;
    this.setPosition(Tiny.WIN_SIZE.width / 2, 99999);
    this.setAnchor(0.5);
  }

  changeNet(current) {
    this.texture = Tiny.Texture.fromImage(RESOURCES['s_web' + current + '_png']);
  }

  open (toX, toY) {
    this.setPosition(toX * 1.7,toY * 1.7);
  }

}

export default Net;
