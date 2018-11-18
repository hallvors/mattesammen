var params;
var timingLog = [];
var startTime;
var doneQuestions = {};

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

socket.on("connect", handleConnect);
socket.on("error", handleError);
socket.on("disconnect", handleDisconnect);
socket.on("reconnect", handleReconnect);

function getRandomArbitrary(min, max) {
  return Math.floor(Math.random() * (max - min)) + min;
}

function nextTask() {
  var div = document.getElementById("tasks");
  div.innerHTML = "";
  div.className = "";
  var num1 = getRandomArbitrary(params.start, params.end);
  var num2 = getRandomArbitrary(params.start, params.end);
  var problem = formatProblem(num1, num2);
  // half-hearted attempt at down-prioritising stuff this student knows well
  // the higher the level, the more we want to avoid well-known stuff
  var attempts = level;
  while (
    attempts > 0 &&
    doneQuestions[problem] &&
    doneQuestions[problem].known
  ) {
    num1 = getRandomArbitrary(params.start, params.end);
    num2 = getRandomArbitrary(params.start, params.end);
    problem = formatProblem(num1, num2);
    attempts--;
  }
  var answer = num1 * num2;
  var type = level < 3 ? 1 : getRandomArbitrary(1, 4);
  document.getElementById("stars").className = "";
  startTime = Date.now();

  switch (type) {
    case 1:
      return createNormalMultiplicationTask(div, num1, num2, answer);
    case 2:
      return createMissingNumMultiplicationTask(div, num1, num2, answer);
    case 3:
      return createFindNumbersMultiplicationTask(div, num1, num2, answer);
  }
}

function formatProblem(num1, num2) {
  return num1 + " * " + num2 + " = " + num1 * num2;
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
    doneQuestions[problem] = {seen: true};
  }
  var log = document.getElementById("log");
  var duration = Date.now() - startTime;
  elm("p", {}, [document.createTextNode("⭐ " + problem)], log);
  document.getElementById("stars").className = "bounce";
  socket.emit("correct-answer", {
    level: level,
    name: name,
    duration: duration,
    problem: problem
  });
  setTimeout(nextTask, 600);
  timingLog.push(duration);
  doneQuestions[problem].duration = duration;
  if (duration < 3000) {
    doneQuestions[problem].known = true;
  }
  considerUppingLevel();
}

function createNormalMultiplicationTask(div, num1, num2, answer) {
  var problem = formatProblem(num1, num2);
  elm(
    "form",
    { onsubmit: handleAnswer },
    [
      elm("p", { class: "the_task" }, [
        document.createTextNode(num1 + " * " + num2 + " = "),
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

function createMissingNumMultiplicationTask(div, num1, num2, answer) {
  var problem = formatProblem(num1, num2);
  elm(
    "form",
    { onsubmit: handleAnswer },
    [
      elm("p", { class: "the_task" }, [
        document.createTextNode(num1 + " * "),
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

function createFindNumbersMultiplicationTask(div, num1, num2, answer) {
  var problem = formatProblem(num1, num2);
  var gridsize = level <= 5 ? 3 : 4;
  var selectedAnswers = [];
  var numbers = [];
  for (var i = 0; i < gridsize * gridsize; i++) {
    numbers.push(getRandomArbitrary(0, Math.max(num1, num2) + gridsize));
  }
  // if the numbers we want happen not to be in this array,
  // replace random ones with the ones we need
  // (Check second number before we insert first in case they are same)
  var replaceFirst = numbers.indexOf(num1) === -1;
  var replaceOtherToo = numbers.indexOf(num2) === -1;
  // If both numbers are the same, our checks can fool us..
  if (num1 === num2 && numbers.indexOf(num1) === numbers.lastIndexOf(num2)) {
    replaceOtherToo = true;
  }
  if (replaceFirst) {
    i = getRandomArbitrary(0, numbers.length);
    console.log(numbers.length, 'inserting '+num1+' at ' + i + ', replacing ' + numbers[i])
    numbers.splice(i, 1, num1);
  }
  if (replaceOtherToo) {
    i = getRandomArbitrary(0, numbers.length);
    if (numbers[i] === num1) {
      // Whoopsie.. Do not remove num1 to insert num2..!
      i = i < numbers.length - 1 ? i + 1 : 0;
    }
    console.log(numbers.length, 'inserting '+num2+' at ' + i + ', replacing ' + numbers[i])
    numbers.splice(i, 1, num2);
  }
  elm(
    "form",
    { onsubmit: handleAnswer, 'class': 'grid grid-' + gridsize },
    [document.createTextNode('Finn to tall du kan multiplisere for å få ' + answer)].concat(numbers.map(function(num) {
      return elm(
        "button",
        {
          type: "button",
          onclick: handlePartialAnswer(num1, num2, selectedAnswers),
          class: "gridbtn unselected"
        },
        [document.createTextNode(num)]
      );
    })),
    div
  );
  //elm('p', {}, [document.createTextNode(' = ' + answer)], div);
}

function handlePartialAnswer(num1, num2, selectedAnswers) {
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
    if (
      selectedAnswers.length === 2 &&
      ((selectedAnswers.indexOf(num1) > -1 &&
      selectedAnswers.indexOf(num2) > -1) ||
      selectedAnswers[0] * selectedAnswers[1] === num1 * num2)
    ) {
      handleCorrectAnswer(formatProblem(selectedAnswers[0], selectedAnswers[1]));
    }
  };
}

function considerUppingLevel() {
  var total = timingLog.reduce(function(total, current) {
    return total + current;
  }, 0);
  var avg = total / timingLog.length;
  // going level up is harder at higher levels, easier at low ones
  if ((level === 0 || level === 1) && avg < 4000) {
    return levelUp();
  }
  // for levels above 1, we require
  // * a certain number of problems completed (> level * 1.2)
  // * less than 4,5 seconds of consideration per problem on average
  // * students who have completed lots of problems at this level get
  // level'ed up with worse average.
  if (
    (timingLog.length >= level * 1.2 && avg < 4500) ||
    (timingLog.length >= level * 2.5 && avg < 5500)
  ) {
    levelUp();
  }
}

function levelUp() {
  level++;
  flashLevelUp(level);
  timingLog.length = 0;
  params.end = level + 2;
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
