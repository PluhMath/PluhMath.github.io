import RESOURCES from './Resource';

class Score extends Tiny.Text {
  constructor(score) {
    super(score);
    this._parent = parent;
    this.setPosition(0, Tiny.WIN_SIZE.height- 80/2);
    this.setAnchor(0.5);
  }

  changeScore(score) {
    this.text = score;
  }

}

export default Score;
