var timingLog = [];
var startTime;
var taskIndex = -1;
var supportedTypes = ['predefined-answers'];
var doneQuestions = [];

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
  if (params[taskIndex]) {
    elm(
      'p',
      {},
      [
        document.createTextNode(
          'Skriv svaret her (oppgave ' +
            (taskIndex + 1) +
            '/' +
            params.length +
            '):'
        ),
      ],
      div
    );
    elm(
      'input',
      { name: 'answer', onkeyup: handleAnswer, autocapitalize: 'none' },
      null,
      div
    );
  } else {
    elm('p', {}, [document.createTextNode('Ferdig!')], div);
  }
}

function handleAnswer(evt) {
  evt.preventDefault();
  var answerElm = document.getElementsByName('answer')[0];
  var answer = answerElm.value.replace(/^\s/g, '').replace(/\s$/g, '');
  if (answer === params[taskIndex]) {
    handleCorrectAnswer(answer);
  }
}

function handleCorrectAnswer(answer) {
  if (doneQuestions[taskIndex]) {
    return;
  }
  var log = document.getElementById('log');
  var duration = Date.now() - startTime;
  if (log.firstChild) {
    log.insertBefore(
      elm('p', {}, [document.createTextNode('⭐ ' + answer)]),
      log.firstChild
    );
  }
  var answerElm = document.getElementsByName('answer')[0];
  answerElm.value = '';
  //  document.getElementById("count").firstChild.data = log.childNodes.length - 1;
  bounceStars();
  console.log('will emit correct-answer, ' + answer);
  socket.emit('correct-answer', {
    name: name,
    duration: duration,
    problem: answer,
    predef: true,
  });
  // 1 minute threshold, more likely to be "away from computer"
  // than "struggled to find answer"
  if (duration < 60000) {
    timingLog.push(duration);
  }
  doneQuestions[taskIndex] = { duration };
  if (duration < 3000) {
    doneQuestions[taskIndex].known = true;
  }
}
socket.on('next-task-ready', function (payload) {
  console.log('next-task-ready', payload);
  taskIndex = payload.taskIndex;
  nextTask();
});
