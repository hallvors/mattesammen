/*
Functions used on both admin- and pupil-screens
*/
function elm(tag, props, children, parent) {
  var el = document.createElement(tag);
  for (var p in props) {
    if (typeof props[p] === 'function') {
      el[p] = props[p];
    } else {
      el.setAttribute(p, props[p]);
    }
  }
  if (children && children.length) {
    for (var i = 0; i < children.length; i++) {
      el.appendChild(children[i]);
    }
  }
  if (parent) {
    parent.appendChild(el);
  }
  return el;
}

function handleConnect() {
  console.log(arguments);
}

function handleError() {
  console.log(arguments);
}

function handleDisconnect() {
  console.log(arguments);
}

function handleReconnect() {
  console.log(arguments);
}
if (typeof socket !== 'undefined') {
  socket.on('connect', handleConnect);
  socket.on('error', handleError);
  socket.on('disconnect', handleDisconnect);
  socket.on('reconnect', handleReconnect);
}

function bounceStars() {
  document.getElementById('stars').className = 'bounce';
  setTimeout(function () {
    document.getElementById('stars').className = '';
  }, 800);
}

function getRandomWholeNumber(min, max) {
  return Math.floor(Math.random() * (max - min)) + min;
}

var figureCode = {
  circle: function (elm, canvWidth) {
    return elm.circle(canvWidth / 2, canvWidth / 2, canvWidth / 4);
  },
  square: function (elm, canvWidth) {
    return elm.rect(canvWidth / 3, canvWidth / 3, canvWidth / 3, canvWidth / 3);
  },
  rectangle: function (elm, canvWidth) {
    return elm.rect(
      canvWidth / 5,
      canvWidth / 2.5,
      (canvWidth / 5) * 3,
      canvWidth / 5
    );
  },
  triangle1: function (elm, canvWidth) {
    var path = [
      'M' + canvWidth / 2 + ',' + canvWidth / 3,
      'l' + canvWidth / 3 + ',' + canvWidth / 3,
      'l-' + (canvWidth - canvWidth / 3) + ',' + 0,
      'L' + canvWidth / 2 + ',' + canvWidth / 3,
    ];
    return elm.path(path.join(''));
  },
  triangle2: function (elm, canvWidth) {
    var path = [
      'M' + canvWidth / 3 + ',' + canvWidth / 3,
      'l' + canvWidth / 3 + ',' + canvWidth / 3,
      'l-' + canvWidth / 3 + ',' + 0,
      'L' + canvWidth / 3 + ',' + canvWidth / 3,
    ];
    return elm.path(path.join(''));
  },
  poly5: function (elm, canvWidth) {
    var x = canvWidth / 2,
      y = canvWidth / 2,
      r = canvWidth / 4,
      n = 5;
    var xx,
      yy,
      i,
      a,
      pathString = '';
    for (i = 0; i <= n; ++i) {
      a = (4 * Math.PI * i + Math.PI * n + 2 * Math.PI) / (2 * n);
      xx = x + r * Math.cos(a);
      yy = y + r * Math.sin(a);
      pathString += (i == 0 ? 'M ' : ' L ') + xx + ' ' + yy;
    }
    pathString += ' z';
    return elm.path(pathString);
  },
  poly6: function (elm, canvWidth) {
    var x = canvWidth / 2,
      y = canvWidth / 2,
      r = canvWidth / 4,
      n = 6;
    var xx,
      yy,
      i,
      a,
      pathString = '';
    for (i = 0; i <= n; ++i) {
      a = (4 * Math.PI * i + Math.PI * n + 2 * Math.PI) / (2 * n);
      xx = x + r * Math.cos(a);
      yy = y + r * Math.sin(a);
      pathString += (i == 0 ? 'M ' : ' L ') + xx + ' ' + yy;
    }
    pathString += ' z';
    return elm.path(pathString);
  },
  paralellogram: function (elm, canvWidth) {
    var path = [
      'M' + canvWidth / 6 + ',' + canvWidth / 3,
      'l' + canvWidth / 3 + ', 0',
      'l' + canvWidth / 3 + ',' + canvWidth / 3,
      'l-' + canvWidth / 3 + ',' + 0,
      'Z',
    ];
    return elm.path(path.join(''));
  },
  trapes: function (elm, canvWidth) {
    var path = [
      'M' + canvWidth / 3 + ',' + canvWidth / 3,
      'l' + canvWidth / 3 + ', 0',
      'l' + canvWidth / 4 + ',' + canvWidth / 4,
      'l-' + (canvWidth / 12) * 10 + ',0',
      'Z',
    ];
    console.log(path);
    return elm.path(path.join(''));
  },
};

var keys = Object.keys(figureCode);

function createAndFillGrid(parentElm, cards, evtHandler) {
  // let's do 5x5
  var canvases = [];
  let width = Math.floor(parentElm.offsetWidth / 5.5);
  let counter = 0;
  for (var i = 0; i < 5; i++) {
    for (var j = 0; j < 5; j++) {
      var card = cards[counter];
      var canvas = Raphael(parentElm, width, width);
      canvases.push(canvas);
      var border = canvases[canvases.length - 1].rect(0, 0, width, width);
      border.attr('stroke-width', '4px');
      border.attr('fill', '#fff');
      var elm = figureCode[card.type](canvases[canvases.length - 1], width);
      cards[counter].elm = elm;
      cards[counter].cell = border;
      if (cards[counter].selected) {
        border.attr('stroke', '#090');
        border.attr('fill', '#efe');
      }
      if (evtHandler) {
        border.click(evtHandler(counter));
      }
      counter++;
    }
  }
}
