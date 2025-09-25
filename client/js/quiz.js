var timingLog = [];
var startTime;
var taskIndex = -1;
var supportedTypes = ['quiz'];
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
          'Velg svar (oppgave ' + (taskIndex + 1) + '/' + params.length + '):'
        ),
      ],
      div
    );
    var possibleAnswers = [params[taskIndex].a].concat(params[taskIndex].alt);
    fisherYatesShuffle(possibleAnswers);
    for (var i = 0; i < possibleAnswers.length; i++) {
      elm(
        'button',
        {
          name: 'answer',
          class: 'quiz-answer',
          type: 'button',
          onclick: handleAnswer,
          value: possibleAnswers[i],
        },
        [document.createTextNode(possibleAnswers[i])],
        div
      );
    }
  } else {
    elm('p', {}, [document.createTextNode('Ferdig!')], div);
  }
}

function handleAnswer(evt) {
  evt.preventDefault();
  var answerElm = evt.target;
  var answer = answerElm.value;
  var buttons = document.getElementById('tasks').getElementsByTagName('button');
  // allow only one guess per case per 3 seconds
  // this discourages sneaky "try to win quiz by clicking all buttons as fast as possible"
  for (var i = 0; i < buttons.length; i++) {
    buttons[i].disabled = true;
  }
  if (answer === params[taskIndex].a) {
    answerElm.classList.add('correct');
    handleCorrectAnswer(answer);
  } else {
    answerElm.classList.add('wrong');
    handleWrongAnswer(answer);
    setTimeout(reenableUnusedButtons, 3000);
  }
}

function reenableUnusedButtons() {
  var buttons = document.getElementById('tasks').getElementsByTagName('button');
  // allow only one guess per case per 3 seconds
  // this discourages sneaky "try to win quiz by clicking all buttons as fast as possible"
  for (var i = 0; i < buttons.length; i++) {
    if (
      !(
        buttons[i].classList.contains('wrong') ||
        buttons[i].classList.contains('correct')
      )
    )
      buttons[i].disabled = false;
  }
}

function handleWrongAnswer(answer) {
  socket.emit('wrong-answer', { name, answer });
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
  bounceStars();
  console.log('will emit correct-answer, ' + answer);
  socket.emit('correct-answer', {
    name: name,
    duration: duration,
    problem: answer,
    predef: true,
  });
  timingLog.push(duration);
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
