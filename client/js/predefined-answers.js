var timingLog = [];
var startTime;
var questionIndex = -1;
var supportedTypes = ['predefined-answers'];
var doneQuestions = {};

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
  questionIndex++;
  if (params[questionIndex]) {
    elm('p', {}, [document.createTextNode('Skriv svaret her (oppgave ' +
      (questionIndex + 1) + '/' + params.length + '):')], div);
    elm('input', {name: 'answer', onkeyup: handleAnswer}, null, div);
  } else {
    elm('p', {}, [document.createTextNode('Ferdig!')], div);
  }

}

function handleAnswer(evt) {
  evt.preventDefault();
  var answerElm = document.getElementsByName("answer")[0];
  var answer = answerElm.value.replace(/\s/g, '').toLowerCase();
  if (answer === params[questionIndex]) {
    handleCorrectAnswer(answer);
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
  var answerElm = document.getElementsByName("answer")[0];
  answerElm.value = '';
//  document.getElementById("count").firstChild.data = log.childNodes.length - 1;
  bounceStars();
  console.log('will emit correct-answer, ' + answer);
  socket.emit("correct-answer", {
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
  doneQuestions[answer] = {duration};
  if (duration < 3000) {
    doneQuestions[answer].known = true;
  }
}
socket.on('next-task-ready', function (payload) {
    console.log('next-task-ready', payload)
    nextTask();
});
