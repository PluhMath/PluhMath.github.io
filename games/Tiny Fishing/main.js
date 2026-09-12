import RESOURCES from './src/Resource';
import StartLayer from './src/StartLayer';
import './src/css/orientation.css';

  var config = {
    showFPS: true,
    orientation: 1,
    dpi: 2,
    renderOptions: {
      backgroundColor: 0x2a3145
    }
  };
  Tiny.app = new Tiny.Application(config);

  var main = {
    init: function () {
      console.log('init');

      var self = this;
      this.orientationChangeHandle = function () {
        self.orientationDetection();
      };
      window.addEventListener('orientationchange', this.orientationChangeHandle, false);
      this.orientationDetection();
    },
    orientationDetection: function () {
      var orientation = config.orientation;
      if (!Tiny.isUndefined(window.orientation) && orientation === 1 && Math.abs(window.orientation / 90) != 1) {
        //横屏
      } else if (!Tiny.isUndefined(window.orientation) && orientation === 0 && Math.abs(window.orientation / 90) != 0) {
        //竖屏
      } else {
        this.resourceLoad();
      }
    },
    resourceLoad: function () {
      var resources = [];
      for (var key in RESOURCES) {
        resources.push(RESOURCES[key]);
      }
      var progress = document.getElementById('progress');
      var percent = document.getElementById('percent');

      Tiny.Loader.run({
        resources: resources,
        onProgress: function (pre, res) {
          var num = ~~pre;
          //更新UI
          percent.innerHTML = num + '%';
          progress.style.width = num + '%';
        },
        onAllComplete: function () {
          console.log('all complete');
          //clear DOM
          var body = document.body;
          body.removeChild(percent);
          body.removeChild(progress.parentNode);

          Tiny.app.run(new StartLayer());
          window.removeEventListener('orientationchange', self.orientationChangeHandle);
        },
      });
    },
  };
  main.init();

