/* eslint-disable */
import RESOURCES from './Resource';

class Bullet extends Tiny.Sprite {
  constructor(parent) {
    var texture = Tiny.Texture.fromImage(RESOURCES['s_bullet' + parent.currentPower + '_png']);
    super(texture);
    this._parent = parent;
    this.setPosition(Tiny.WIN_SIZE.width/2,999999);  //放到屏幕之外
    this.setAnchor(0.5);
  }

  changeBullet(currentPower) {
    this.texture = Tiny.Texture.fromImage(RESOURCES['s_bullet' + currentPower + '_png']);
  }

  changeAngle (deg) {
    this.setRotation(deg);
  }

  shotBullet (toX, toY) {

    var self = this;
    this.setPosition(Tiny.WIN_SIZE.width/2, Tiny.WIN_SIZE.height- 120/2);

    // 与 Tiny.WIN_SIZE. 与 e.data.global.x 差1.7倍？？？？
    this.fly = Tiny.MoveTo(500, {x: toX * 1.7, y: toY * 1.7});
    this.runAction([this.fly]);

    this.fly.onComplete = function (tween, object) {
      object.setPosition(99999,99999);
      self._parent._net.open(toX, toY);
      self._parent._fishGroup.hasFishAttached(toX, toY);
      setTimeout(function () {
        self._parent._net.setPosition(99999,99999);
      },500);
    }
  }
}


export default Bullet;
