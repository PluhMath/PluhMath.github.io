
//import ShotLayer from './ShotLayer';
//import ControlLayer from './ControlLayer';
import BackGround from './BackGround';
import BottomDeck from './BottomDeck';
import Cannon from './Cannon';
import MinusButton from './MinusButton';
import PlusButton from './PlusButton';

import FishGroup from './FishGroup';
import Bullet from './Bullet';
import Net from './Net';
import Score from './Score';
import Coin from './Coin';

class StartLayer extends Tiny.Container {
  constructor () {

    super();

    this.currentPower = 1;

    //设置当前layer可点击
    this.interactive = true;

    this.score = 0;

    //创建炮架
    this._bottomdeck = new BottomDeck();

    // 创建大炮
    this._cannon = new Cannon(this);

    // 创建minus - 按钮
    this._minusbtn = new MinusButton(this);

    // 创建plus + 按钮
    this._plusbtn = new PlusButton(this);

    this._backgound = BackGround.create();

    //this._shotLayer = new ShotLayer(this);

    //this._controlLayer = new ControlLayer(this);

    // this._shotLayer.setEventEnabled(true);

    // 创建鱼群
    this._fishGroup = new FishGroup(this);

    // 创建鱼
    // this._fish = new Fish(1,this);

    // 创建子弹
    this._bullet = new Bullet(this);

    this._net = new Net(this);

    this._coin = new Coin(this);

    this.scoreText = new Score(this.score);

    //设置当前layer可点击
    this.interactive = true;

    var self = this;
    this.tap = this.mouseup = function (e) {
      var x = e.data.global.x;
      var y = e.data.global.y;
      var deg = this.getAngle(x,y);
      this._cannon.changeAngle(deg);
      this._bullet.changeAngle(deg);
      self._bullet.shotBullet(x,y);
    }
    this.init();
  }
  init () {
    this.addChild(this._backgound);

    //this.addChild(this._controlLayer);
    //this.addChild(this._shotLayer);

    this.addChild(this._bottomdeck);
    this.addChild(this._cannon);
    this.addChild(this._minusbtn);
    this.addChild(this._plusbtn);

    this._fishGroup.add();
    this.addChild(this._bullet);
    this.addChild(this._net);
    //this.addChild(this._fish);
    this.addChild(this._coin);
    this.addChild(this.scoreText);

  }

  changePower (plus) {
    var self = this;
    return function () {
      var current = self.currentPower;
      if (plus) {
        if (current < 7) {
          current++;
        }
      } else {
        if (current > 1) {
          current--;
        }
      }
      self.currentPower = current;
      self._bullet.changeBullet(current);
      self._cannon.changeCannon(current);
      self._net.changeNet(current)
    }
  }

  getAngle (toX, toY) {
    var cannnonPosi = this._cannon.getGlobalPosition();
    var x = toX - cannnonPosi.x;
    var y = cannnonPosi.y - toY;
    return Math.atan2(x,y); // 角度是弧度值
  }
}

export default StartLayer;
