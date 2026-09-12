import RESOURCE from './Resource';

class Coin extends Tiny.AnimatedSprite{
  constructor () {
    var textures = [];
    for (var i=1; i<10; i++) {
      var TextureCache = Tiny.TextureCache[RESOURCE['s_coinAni1_0' + i + '_png']];
      textures.push(TextureCache);
    }
    var TextureCache10 = Tiny.TextureCache[RESOURCE['s_coinAni1_10_png']];
    textures.push(TextureCache10);

    super(textures);
    this.setPosition(Tiny.WIN_SIZE.width / 2, 99999);
    this.animationSpeed = 0.5;
    this.play();
  }

  showCoin (x,y) {
    var self = this;
    this.setPosition(x, y);
    setTimeout(function () {
      self.move = Tiny.MoveTo(1000, Tiny.point(Tiny.WIN_SIZE.width/2 -120, Tiny.WIN_SIZE.height-50));
      self.move.setInterpolation(Tiny.TWEEN.Interpolation.Bezier);
      self.runAction(self.move);
      self.move.onComplete = function () {
        self.setPosition(Tiny.WIN_SIZE.width / 2, 99999);
      }
    },500);

  }
}
export default Coin;
