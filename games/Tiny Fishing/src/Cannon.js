/* eslint-disable */
import RESOURCES from './Resource';

class Cannon extends Tiny.Sprite {
  constructor(parent) {

    var texture = Tiny.Texture.fromImage(RESOURCES['s_cannon' + parent.currentPower + '_png']);
    super(texture);
    this._parent = parent;
    this.width = 58;
    this.height = 66;
    this.setPosition(Tiny.WIN_SIZE.width/2, Tiny.WIN_SIZE.height- 80/2);
    this.setAnchor(0.5);
  }

  changeCannon(current) {
    this.texture = Tiny.Texture.fromImage(RESOURCES['s_cannon' + current + '_png']);
  }

  changeAngle (deg) {
    this.setRotation(deg);
  }

}

Cannon.create = function () {
  return new Cannon();
};

export default Cannon;
