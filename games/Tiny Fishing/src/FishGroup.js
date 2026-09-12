import Fish from './Fish';

class FishGroup {
  constructor (parent) {
    this._parent = parent;
    this._fishes = [];
  }
  add () {
    for (var i = 0;i<50;i++) {
      var randomKind = Math.ceil(Math.random() * 5);
      this._fishes.push(new Fish(randomKind, this._parent));
      this._parent.addChild(this._fishes[i]);
      this._fishes[i].play();
    }
  }
  supplement(type){
    var newFish = new Fish(type, this._parent)
    this._fishes.push(newFish);
    this._parent.addChild(newFish);
    newFish.play();
  }
  hasFishAttached (toX, toY) {
    for (var i=0;i<this._fishes.length; i++) {
      this._fishes[i].isCollision(i,toX, toY);
    }
  }

}
export default FishGroup;
