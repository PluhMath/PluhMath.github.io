import Button from './Button';
import RESOURCES from './Resource';

class plusButton extends Button {
  constructor (parent) {
    super(RESOURCES['s_cannon_plus_png'], RESOURCES['s_cannon_plus_down_png'], parent.changePower(true));
    this._parent = parent;
    this.setPosition(Tiny.WIN_SIZE.width/2+140/2, Tiny.WIN_SIZE.height- 31);
  }

}
export default plusButton;

