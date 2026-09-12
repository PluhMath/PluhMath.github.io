/*

import FishGroup from './FishGroup';
import Bullet from './Bullet';

class ShotLayer extends Tiny.Container {
  constructor (parent) {
    super();

    this._parent = parent;

    // 创建鱼群
    this._fishGroup = new FishGroup(this);

    // 创建子弹
    this._bullet = new Bullet(this);

    //设置当前layer可点击
    this.interactive = true;

    var self = this;
    this.tap = this.mouseup = function (e) {
      debugger;
      var x = e.data.global.x;
      var y = e.data.global.y;
      self._bullet.shotBullet(x,y);
    }

    this.init();
    console.log('x' + this.x + 'y' + this.y + '***' + this.width + '*****' + this.height);
  }
  init () {
    this._fishGroup.add();
    this.addChild(this._bullet);
  }
}

export default ShotLayer;
 */
