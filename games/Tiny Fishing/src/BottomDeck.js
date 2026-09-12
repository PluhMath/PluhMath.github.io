/* eslint-disable */
import RESOURCES from './Resource';
import './Button';
import Fish from './Fish';

class BottomDeck extends Tiny.Sprite {
  constructor () {

    var textrue = Tiny.TextureCache[RESOURCES['s_bottom_bar_png']];
    super(textrue);
    this.setPosition(Tiny.WIN_SIZE.width/2-850/2, Tiny.WIN_SIZE.height- 72);

  }
  shotBullet (toX,toY) {
    var self = this;
    var cannnonPosi = this.cannon.getGlobalPosition();
    var x = toX - cannnonPosi.x;
    var y = cannnonPosi.y - toY;
    var deg = Math.atan2(x,y); // 角度是弧度值

    this.cannon.setRotation(deg);
    this.bullet.setRotation(deg);
    this.bullet.setPosition(Tiny.WIN_SIZE.width/2, Tiny.WIN_SIZE.height- 120/2);
    // 与 Tiny.WIN_SIZE. 与 e.data.global.x 差1.7倍？？？？
    this.bullet.fly = Tiny.MoveTo(500, {x: toX * 1.7, y: toY * 1.7});
    this.bullet.runAction([this.bullet.fly]);
    var rect = new Tiny.Rectangle(Tiny.WIN_SIZE.width/2, Tiny.WIN_SIZE.height- 120/2, this.fishingNet.width, this.fishingNet.height);

    this.bullet.fly.onUpdate = function (tween, object) {
      debugger;
      if (Tiny.rectIntersectsRect(self.bullet.getBounds(),self.fish.getBounds())) {
        console.log(999);
      } else {
        console.log(333);
      }
    }
    this.bullet.fly.onComplete = function (tween, object) {
      object.setPosition(99999,99999);
      self.fishingNet.setPosition(toX * 1.7,toY * 1.7);
      setTimeout(function () {
        self.fishingNet.setPosition(99999,99999);
      },500);
    }

  }
}
BottomDeck.create = () => {
  return new BottomDeck();
}

export default BottomDeck;
