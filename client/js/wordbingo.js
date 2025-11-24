/*
Geometribingo
Client-side code

*/
var theAnswer = null;
var selectedAlready = false;
var level = 1;

var cards = [];
const rowBingoSeen = [];
const colBingoSeen = [];
const myWordsRandomised = fisherYatesShuffle(params);
for (var i = 0; i < myWordsRandomised.length; i++) {
  cards.push({
    type: 'word',
    word: myWordsRandomised[i],
    selected: false,
    elm: null,
  });
}

function init() {
  var div = document.getElementById('tasks');
  div.style.marginTop = '15px';
  div.style.marginLeft = div.style.marginRight = 'auto';
  createAndFillGrid(div, cards, evtHandler);
}

function evtHandler(itemnr) {
  return function () {
    if (selectedAlready) {
      return;
    }
    if (
      !cards[itemnr].selected &&
      ((cards[itemnr].type === 'word' && cards[itemnr].word === theAnswer) ||
        cards[itemnr].type === theAnswer)
    ) {
      cards[itemnr].selected = true;
      cards[itemnr].cell.attr('stroke', '#090');
      cards[itemnr].cell.attr('fill', '#efe');
      selectedAlready = true;
      console.log('will emit answer', { level: level, cards: cards });
      socket.emit('correct-answer', {
        level: level,
        cards: cards.map((card) => ({
          type: card.type,
          selected: card.selected,
          word: card.word,
        })),
      });

      var gridSide = Math.sqrt(cards.length);
      // BINGO?
      // go through the rows and check if all in a row are selected
      for (var i = 0; i < gridSide; i++) {
        if (rowBingoSeen.includes(i)) {
          continue;
        }
        let bingo = true;
        for (var j = 0; j < gridSide; j++) {
          // cards on this row: (i * gridSize) + j
          bingo = bingo && cards[i * gridSide + j].selected;
        }
        if (bingo) {
          level++;
          bounceStars();
          socket.emit('bingo', { level: level, classId: classId });
          rowBingoSeen.push(i);
        }
      }
      // go through the cols and check if all in a col are selected
      for (var i = 0; i < gridSide; i++) {
        if (colBingoSeen.includes(i)) {
          continue;
        }
        let bingo = true;
        for (var j = 0; j < gridSide; j++) {
          // cards on this row: (j * gridSize) + i
          bingo = bingo && cards[j * gridSide + i].selected;
        }
        if (bingo) {
          level++;
          bounceStars();
          socket.emit('bingo', { level: level, classId: classId });
          colBingoSeen.push(i);
        }
      }
    }
  };
}

socket.on('new-bingo-answer', function (payload) {
  console.log('new-bingo-answer', payload);
  theAnswer = payload.answer;
  selectedAlready = false;
});

window.onload = init;
