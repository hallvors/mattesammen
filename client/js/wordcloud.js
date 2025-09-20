var timingLog = [];
var startTime;
var taskIndex = -1;
var supportedTypes = ['wordcloud'];
var doneQuestions = [];
var numWordsInCloud = 2;
// Slightly clumsy, but do not process button clicks while we do a small timeout
// to show the found words
var pausedForTimeout = false;
// Params is an array of comma-separated strings - make it an array of arrays
var allWords = params.map(function (item) {
  return item.split(/,\s?/g);
});
var firstWords = [];
function nextTask() {
  var div = document.getElementById('tasks');
  var sessionType = window.sessionType;
  if (!supportedTypes.includes(sessionType)) {
    // this session type is not supported by this .js-file
    throw new Error('Not supported: ' + sessionType);
  }
  div.innerHTML = '';
  div.className = '';
  startTime = Date.now();
  elm('p', {}, [document.createTextNode('Velg ord som hører sammen')], div);
  var answerElm = elm(
    'p',
    { id: 'answer', class: 'wordcloud-answer' },
    [],
    div
  );
  var cloud =
    document.getElementById('thecloud') ||
    elm('p', { id: 'thecloud' }, [], div);
  // pick numWordsInCloud lines from allWords (random from the numWordsInCloud * 1,5 first items)
  var words = [];
  var usedIndexes = [];
  var max = Math.ceil(numWordsInCloud * 1.5);
  // we don't have space for an enourmous number of buttons.. We make a window of max 15 items
  var min = max > 15 ? max - 15 : 0;
  if (max > allWords.length) {
    max = allWords.length;
    min = Math.max(max - 15, 0);
  }
  while (words.length < numWordsInCloud) {
    var index = getRandomWholeNumber(min, max);
    if (!usedIndexes.includes(index)) {
      words.push(allWords[index].concat([]));
      usedIndexes.push(index);
    }
  }
  // extract all the initial words
  firstWords = words.map(function (item) {
    return item.shift();
  });
  // flatten arrays of remaining words and jumble them up
  words = fisherYatesShuffle(words.flat());
  // render each word as button
  for (var i = 0; i < words.length; i++) {
    elm(
      'span',
      { class: 'clouditem' },
      [
        elm(
          'input',
          {
            name: words[i],
            value: words[i],
            type: 'button',
            onclick: handleAnswer,
          },
          null
        ),
      ],
      cloud
    );
  }
  answerElm.innerText = firstWords.shift();
}

function handleAnswer(evt) {
  evt.preventDefault();
  const word = evt.target.name;
  var answerElm = document.getElementById('answer');
  var currentWords = answerElm.innerText
    ? answerElm.innerText.split(/ - /g)
    : [];
  currentWords.push(word);
  var found = allWords.find((line) => {
    return line.reduce(function (previous, current, index) {
      if (currentWords[index]) {
        return previous && currentWords[index] === current;
      }
      return previous;
    }, true);
  });
  if (found) {
    answerElm.innerText += (answerElm.innerText ? ' - ' : '') + word;
    evt.target.parentNode.removeChild(evt.target);
    if (found.length === currentWords.length) {
      handleCorrectAnswer(currentWords);
    }
  }
}

function handleCorrectAnswer(answer) {
  var log = document.getElementById('log');
  var duration = Date.now() - startTime;
  if (log.firstChild) {
    log.insertBefore(
      elm('p', {}, [document.createTextNode('⭐ ' + answer.join(' - '))]),
      log.firstChild
    );
  }
  bounceStars();
  console.log('will emit correct-answer, ' + answer);
  socket.emit('correct-answer', {
    name: name,
    duration: duration,
    problem: answer,
    wordcloud: true,
  });
  // 1 minute threshold, more likely to be "away from computer"
  // than "struggled to find answer"
  if (duration < 60000) {
    timingLog.push(duration);
  }
  setTimeout(function () {
    var answerElm = document.getElementById('answer');
    answerElm.innerText = firstWords.shift();
    var div = document.getElementById('tasks');
    if (div.getElementsByTagName('input').length === 0) {
      if (numWordsInCloud < allWords.length) {
        numWordsInCloud++;
      }
      nextTask();
    }
  }, 650);
}

function getRandomWholeNumber(min, max) {
  return Math.floor(Math.random() * (max - min)) + min;
}

// start
nextTask();
