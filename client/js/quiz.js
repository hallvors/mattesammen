var timingLog = [];
var startTime;
var taskIndex = -1;
var supportedTypes = ['quiz', 'poll'];
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
  if (params.questions[taskIndex]) {
    elm(
      'p',
      {},
      [
        document.createTextNode(
          'Velg svar (oppgave ' +
            (taskIndex + 1) +
            '/' +
            params.questions.length +
            '):'
        ),
      ],
      div
    );
    elm(
      'p',
      {},
      [document.createTextNode(params.questions[taskIndex].question)],
      div
    );
    var possibleAnswers = params.questions[taskIndex].answers;
    fisherYatesShuffle(possibleAnswers);
    for (var i = 0; i < possibleAnswers.length; i++) {
      elm(
        'button',
        {
          name: 'answer',
          class: 'quiz-answer',
          type: 'button',
          onclick: handleAnswer,
          value: possibleAnswers[i].answer_id,
        },
        [document.createTextNode(possibleAnswers[i].answer)],
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
  var answer = parseInt(answerElm.value);
  var buttons = document.getElementById('tasks').getElementsByTagName('button');
  // allow only one guess per case per 3 seconds
  // this discourages sneaky "try to win quiz by clicking all buttons as fast as possible"
  for (var i = 0; i < buttons.length; i++) {
    buttons[i].disabled = true;
  }
  const answerData = params.questions[taskIndex].answers.find(
    (item) => item.answer_id === answer
  );
  if (sessionType === 'quiz') {
    if (answerData?.is_correct) {
      answerElm.classList.add('correct');
      handleCorrectAnswer(answerData.answer, answer);
    } else {
      answerElm.classList.add('wrong');
      handleWrongAnswer(answer);
      setTimeout(reenableUnusedButtons, 3000);
    }
  } else if (sessionType === 'poll') {
    // no wrong answers in a poll
    handleCorrectAnswer(answer);
    taskIndex++;
    setTimeout(nextTask, 500);
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

function handleCorrectAnswer(text, answer) {
  if (doneQuestions[taskIndex]) {
    return;
  }
  var log = document.getElementById('log');
  var duration = Date.now() - startTime;
  if (log.firstChild) {
    log.insertBefore(
      elm('p', {}, [document.createTextNode('⭐ ' + text)]),
      log.firstChild
    );
  }
  bounceStars();
  console.log('will emit correct-answer, ' + answer);
  socket.emit('correct-answer', {
    name: name,
    duration: duration,
    problem: params.questions[taskIndex].question_id,
    answer,
    predef: true,
  });
  timingLog.push(duration);
  doneQuestions[taskIndex] = { duration };
  if (duration < 3000) {
    doneQuestions[taskIndex].known = true;
  }
}

if (sessionType === 'quiz') {
  socket.on('next-task-ready', function (payload) {
    console.log('next-task-ready', payload);
    taskIndex = payload.taskIndex;
    nextTask();
  });
} else {
  taskIndex = 0;
  addEventListener('load', nextTask);
}
document.addEventListener(
  'DOMContentLoaded',
  function () {
    if (params.poll_image) {
      var elm = document.getElementById('page-bg');
      if (elm) {
        elm.style.backgroundImage =
          'url(data:image/jpeg;base64,' + encodeURI(params.poll_image) + ')';
      }
    }
  },
  false
);
