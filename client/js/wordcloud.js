var timingLog = [];
var startTime;
var taskIndex = -1;
var supportedTypes = ['wordcloud'];
var doneQuestions = [];
var numWordsInCloud = 2;
// Params should be a string like "formA,formB,formC\r\nformA,formB,formC"
var allWords = params.map(function(item){return item.split(/,/g)});

function nextTask() {
  var div = document.getElementById("tasks");
  var sessionType = window.sessionType;
  if (!supportedTypes.includes(sessionType)) {
    // this session type is not supported by this .js-file
    throw new Error('Not supported: ' + sessionType);
  }
  div.innerHTML = "";
  div.className = "";
  startTime = Date.now();
  elm('p', {}, [document.createTextNode('Velg ord som hører sammen')], div);
  elm('p', {id: 'answer'}, [], div);
  var cloud = document.getElementById('thecloud') || elm('p', { id: 'thecloud'}, [], div);
  // pick numWordsInCloud lines from allWords (random from the numWordsInCloud * 1,5 first items)
  var words = [];
  var usedIndexes = [];
  var max = Math.ceil(numWordsInCloud * 1.5);
    if (max > allWords.length) {max = allWords.length}
    while (words.length < numWordsInCloud) {
        var index = getRandomWholeNumber(0, max);
        if (!usedIndexes.includes(index)) {
            words.push(allWords[index])
            usedIndexes.push(index)
        }
    }
    // flatten arrays and jumble them up
    words = fisherYatesShuffle(words.flat());
    // render each word as button
    for (var i = 0; i<words.length; i++) {
        elm('span', {'class': 'clouditem'}, [elm('input', {name: words[i],value: words[i], type: 'button', onclick: handleAnswer}, null)], cloud)
    }
}

function handleAnswer(evt) {
  evt.preventDefault();
  const word = evt.target.name;
  var answerElm = document.getElementById("answer");
  var currentWords = answerElm.innerText ? answerElm.innerText.split(/ - /g) : [];
  currentWords.push(word);
  var found = allWords.find(line => {
    return line.reduce(function(previous, current, index) {
        if (currentWords[index]) {
            return previous && currentWords[index] === current
        }
        return previous;
    }, true)
  })
  if (found) {
    answerElm.innerText +=(answerElm.innerText ? ' - ' : '')+ word;
    evt.target.parentNode.removeChild(evt.target);
    if (found.length === currentWords.length) {
        handleCorrectAnswer(currentWords);
    }
  }
}

function handleCorrectAnswer(answer) {
  var log = document.getElementById("log");
  var duration = Date.now() - startTime;
  if (log.firstChild) {
    log.insertBefore(
      elm("p", {}, [document.createTextNode("⭐ " + answer)]),
      log.firstChild
    );
  }
  var answerElm = document.getElementById("answer");
  answerElm.innerText = '';
//  document.getElementById("count").firstChild.data = log.childNodes.length - 1;
  bounceStars();
  console.log('will emit correct-answer, ' + answer);
  socket.emit("correct-answer", {
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
  var div = document.getElementById("tasks");
  if (div.getElementsByTagName('input').length === 0) {
    numWordsInCloud++;
    nextTask();
  }
}

function getRandomWholeNumber(min, max) {
  return Math.floor(Math.random() * (max - min)) + min;
}
// https://www.geeksforgeeks.org/javascript/how-to-shuffle-the-elements-of-an-array-in-javascript/
function fisherYatesShuffle(arr) {
  	for (let i = arr.length - 1; i > 0; i--) {
    	const j = Math.floor(Math.random() * (i + 1));
    	[arr[i], arr[j]] = [arr[j], arr[i]];
  	}
  	return arr;
}

// start
nextTask();
