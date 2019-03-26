var timingLog = [];
var startTime;
var doneQuestions = {};

var supportedTypes = ['addisjon', 'subtraksjon', 'multiplikasjon', 'divisjon'];

function nextTask() {
  var div = document.getElementById("tasks");
  var sessionType = window.sessionType;
  if (!supportedTypes.includes(sessionType)) {
    // this session type is not supported by main.js
    throw new Error('Not supported: ' + sessionType);
  }
  div.innerHTML = "";
  div.className = "";
  var secondNumIncrement = level >= 2 ? level / 2 : 0;
  var num1 = getRandomWholeNumber(params.start, params.end);
  var num2 = getRandomWholeNumber(
    params.start,
    params.end + secondNumIncrement
  );
  if (orderIsImportant(sessionType)) {
    if (num1 < num2) { // make sure num1 is greater if order matters..
      num1 = [num2, num2 = num1][0];
    }
  }
  var problem = formatProblem(sessionType, num1, num2);
  // half-hearted attempt at down-prioritising stuff this student knows well
  // the higher the level, the more we want to avoid well-known stuff
  var attempts = level;
  while (
    attempts > 0 &&
    doneQuestions[problem] &&
    doneQuestions[problem].known
  ) {
    num1 = getRandomWholeNumber(params.start, params.end);
    num2 = getRandomWholeNumber(params.start, params.end + secondNumIncrement);
    if (orderIsImportant(sessionType)) {
      if (num1 < num2) { // make sure num1 is greater if order matters..
        num1 = [num2, num2 = num1][0];
      }
    }
    problem = formatProblem(sessionType, num1, num2);
    attempts--;
  }
  var answer = getAnswer(sessionType, num1, num2);
  var type = level < 3 ? 1 : getRandomWholeNumber(1, 4);
  startTime = Date.now();

  switch (type) {
    case 1:
      return createNormalMathTask(div, sessionType, num1, num2, answer);
    case 2:
      return createMissingNumMathTask(div, sessionType, num1, num2, answer);
    case 3:
      return createFindNumbersMathTask(div, sessionType, num1, num2, answer);
  }
}

function getAnswer(type, num1, num2) {
  switch(type) {
    case 'addisjon':
      return num1 + num2;
    case 'subtraksjon':
      return num1 - num2;
    case 'multiplikasjon':
      return num1 * num2;
    case 'divisjon':
      return num1 / num2;
    default:
      throw new Error('unknown type');
  }
}

function formatProblem(type, num1, num2) {
  return num1 + ' ' + SIGN + ' ' + num2 + " = " + getAnswer(type, num1, num2);
}

function orderIsImportant(type) {
  return type === 'subtraksjon' || type === 'divisjon';
}

function elm(tag, props, children, parent) {
  var el = document.createElement(tag);
  for (var p in props) {
    if (typeof props[p] === "function") {
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

function handleAnswer(evt) {
  evt.preventDefault();
  var answerElm = document.getElementsByName("answer")[0];
  var problem = answerElm.getAttribute("data-question");
  var correct = answerElm.getAttribute("data-answer");
  if (parseInt(answerElm.value) === parseInt(correct)) {
    handleCorrectAnswer(problem);
  } else {
    document.getElementById("stars").className = "";
    document.getElementById("tasks").className = "shaky";
    answerElm.placeholder = answerElm.value + " er feil";
    answerElm.value = "";
  }
}

function handleCorrectAnswer(problem) {
  if (!doneQuestions[problem]) {
    // only happens in pick-two-numbers mode where
    // user picked two *other* numbers with same product
    doneQuestions[problem] = { seen: true };
  }
  var log = document.getElementById("log");
  var duration = Date.now() - startTime;
  if (log.firstChild) {
    log.insertBefore(
      elm("p", {}, [document.createTextNode("⭐ " + problem)]),
      log.firstChild
    );
  }
  document.getElementById("count").firstChild.data = log.childNodes.length - 1;
  document.getElementById("stars").className = "bounce";
  setTimeout(function(){document.getElementById("stars").className = "";}, 800);
  socket.emit("correct-answer", {
    level: level,
    name: name,
    duration: duration,
    problem: problem
  });
  // 1 minute threshold, more likely to be "away from computer"
  // than "struggled to find answer"
  if (duration < 60000) {
    timingLog.push(duration);
  }
  doneQuestions[problem].duration = duration;
  if (duration < 3000) {
    doneQuestions[problem].known = true;
  }
  considerUppingLevel();
  nextTask();
}

function createNormalMathTask(div, type, num1, num2, answer) {
  var problem = formatProblem(type, num1, num2);
  elm(
    "form",
    { onsubmit: handleAnswer },
    [
      elm("p", { class: "the_task" }, [
        document.createTextNode(num1 + ' ' + SIGN + ' ' + num2 + " = "),
        elm("input", {
          type: "number",
          name: "answer",
          "data-answer": answer,
          "data-question": problem,
          autofocus: true
        }),
        elm("button", { type: "submit", class: "positive-btn" }, [
          document.createTextNode("✔")
        ])
      ])
    ],
    div
  );
  doneQuestions[problem] = {
    seen: true,
    type: "normal"
  };
  document.getElementsByName("answer")[0].focus();
}

function createMissingNumMathTask(div, type, num1, num2, answer) {
  var problem = formatProblem(type, num1, num2);
  elm(
    "form",
    { onsubmit: handleAnswer },
    [
      elm("p", { class: "the_task" }, [
        document.createTextNode(num1 + ' ' + SIGN + ' '),
        elm("input", {
          type: "number",
          name: "answer",
          "data-answer": num2,
          "data-question": problem,
          autofocus: true
        }),
        document.createTextNode(" = " + answer),
        elm("button", { type: "submit", class: "positive-btn" }, [
          document.createTextNode("✔")
        ])
      ])
    ],
    div
  );
  doneQuestions[problem] = {
    seen: true
  };

  document.getElementsByName("answer")[0].focus();
}

function createFindNumbersMathTask(div, type, num1, num2, answer) {
  var problem = formatProblem(type, num1, num2);
  var gridsize = level <= 5 ? 3 : 4;
  var selectedAnswers = [];
  var numbers = [];
  for (var i = 0; i < gridsize * gridsize; i++) {
    numbers.push(getRandomWholeNumber(0, Math.max(num1, num2) + gridsize));
  }
  // if the numbers we want happen not to be in this array,
  // replace random ones with the ones we need
  var replaceFirst = numbers.indexOf(num1) === -1;
  var replaceOtherToo = numbers.indexOf(num2) === -1;
  // If both numbers are the same, our checks can fool us..
  if (num1 === num2 && numbers.indexOf(num1) === numbers.lastIndexOf(num2)) {
    replaceOtherToo = true;
  }
  if (replaceFirst) {
    i = getRandomWholeNumber(0, numbers.length);
    numbers.splice(i, 1, num1);
  }
  if (replaceOtherToo) {
    i = getRandomWholeNumber(0, numbers.length);
    if (numbers[i] === num1) {
      // Whoopsie.. Do not remove num1 to insert num2..!
      i = i < numbers.length - 2 ? i + 1 : 0;
    }
    numbers.splice(i, 1, num2);
  }
  elm(
    "form",
    { onsubmit: handleAnswer, class: "grid grid-" + gridsize },
    [
      document.createTextNode(
        "Finn to tall du kan " + VERB + " for å få " + answer
      )
    ].concat(
      numbers.map(function(num) {
        return elm(
          "button",
          {
            type: "button",
            onclick: handlePartialAnswer(type, num1, num2, selectedAnswers),
            class: "gridbtn unselected"
          },
          [document.createTextNode(num)]
        );
      })
    ),
    div
  );
  //elm('p', {}, [document.createTextNode(' = ' + answer)], div);
}

function handlePartialAnswer(type, num1, num2, selectedAnswers) {
  return function(evt) {
    var elm = evt.target;
    var num = parseInt(evt.target.firstChild.data);
    if (elm.className.indexOf("unselected") > -1) {
      elm.className = "gridbtn selected";
      selectedAnswers.push(num);
    } else {
      elm.className = "gridbtn unselected";
      selectedAnswers.splice(selectedAnswers.indexOf(num), 1);
    }
    // three cases: correct numbers in correct order, correct numbers in any order for task
    // where order does not matter, OTHER numbers that give the same answer.. Best to just
    // do a calculation and compare output..
    var correctAnswer = getAnswer(type, selectedAnswers[0], selectedAnswers[1]) === getAnswer(type, num1, num2)
    if (
      selectedAnswers.length === 2 &&
      correctAnswer
    ) {
      handleCorrectAnswer(
        formatProblem(type, selectedAnswers[0], selectedAnswers[1])
      );
    }
  };
}

function considerUppingLevel() {
  var total = timingLog.reduce(function(total, current) {
    return total + current;
  }, 0);
  var avg = total / timingLog.length;
  // going level up is harder at higher levels, easier at low ones
  if (level === 0) {
    return levelUp();
  }
  if (level === 1 && avg < 6000) {
    return levelUp();
  }
  if (
    (level === 3 || level === 4) &&
    timingLog.length >= level * 2 &&
    avg < 3500
  ) {
    return levelUp();
  }
  // for levels above 4, we require
  // * a certain number of problems completed (> level * 2.3)
  // * less than 4,5 seconds of consideration per problem on average
  // * students who have completed lots of problems at this level get
  // level'ed up with worse average.
  // Students with very low avg rise faster
  if (
    (avg < 2500 && timingLog.length >= level * 1.5) ||
    (avg < 4500 && timingLog.length >= level * 2.5) ||
    (avg < 5500 && timingLog.length >= level * 5)
  ) {
    levelUp();
  }
}

function levelUp() {
  level++;
  flashLevelUp(level);
  timingLog.length = 0;
  params.end = level + 2;
  params.start = Math.max(1, level - 5);
}

function flashLevelUp(level) {
  var el = elm(
    "div",
    { class: "flash" },
    [document.createTextNode("Nivå opp! Nytt nivå: " + level)],
    document.body
  );
  setTimeout(function() {
    el.parentNode.removeChild(el);
  }, 1200);
}

window.onload = nextTask;
