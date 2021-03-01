/*
Geometribingo
Client-side code

*/
var theAnswer = null;
var selectedAlready = false;
var level = 1;

var cards = [];
for(var i = 0; i < 25; i++) {
  var item = getRandomWholeNumber(0, keys.length - 1);
  cards.push({
    type: keys[item],
    selected: false,
    elm: null,
  });
}

function init() {
  var div = document.getElementById('tasks');
  div.style.marginTop = '15px';
  createAndFillGrid(div, cards, evtHandler);
}

function evtHandler(itemnr) {
  return function() {
    if (selectedAlready) {
      return;
    }
    if (cards[itemnr].type === theAnswer && !cards[itemnr].selected) {
      cards[itemnr].selected = true;
      cards[itemnr].cell.attr('stroke', '#090')
      cards[itemnr].cell.attr('fill', '#efe')
      selectedAlready = true;
      console.log('will emit answer', {level: level, cards: cards})
      socket.emit('correct-answer', {level: level, cards: cards.map(
        card => ({type: card.type, selected: card.selected})
      )});
      // BINGO?
      for(var i = 0; i < 5; i++) {
        if (itemnr >= i * 5 && itemnr < (i + 1) * 5) {
          var state = cards[i * 5].selected &&
            cards[(i * 5) + 1].selected &&
            cards[(i * 5) + 2].selected &&
            cards[(i * 5) + 3].selected &&
            cards[(i * 5) + 4].selected;
          if (state) {
            level++;
            bounceStars();
            socket.emit('bingo', {level: level, classId: classId});
          }
        }
      }
    }
  }
}

socket.on('new-bingo-answer', function(payload) {
  console.log('new-bingo-answer', payload)
  if (payload.answer) {
    theAnswer = payload.answer;
    selectedAlready = false;
  }
});


window.onload = init;
