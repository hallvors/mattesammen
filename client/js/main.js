var params;
var timingLog = [];
var startTime;
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
  var answer = num1 * num2;
  var type = level < 3 ? 1 : getRandomArbitrary(1, 3);
  document.getElementById("stars").className = "";
  startTime = Date.now();

  switch (type) {
    case 1:
      return createNormalMultiplicationTask(div, num1, num2, answer);
    case 2:
      return createMissingNumMultiplicationTask(div, num1, num2, answer);
  }
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
  var log = document.getElementById("log");
  if (parseInt(answerElm.value) === parseInt(correct)) {
    var duration = Date.now() - startTime;
    elm('p', {}, [document.createTextNode('⭐ ' + problem)], log);
    document.getElementById("stars").className = "bounce";
    socket.emit("correct-answer", { level: level, name: name, duration: duration });
    setTimeout(nextTask, 600);
    timingLog.push(duration);
    considerUppingLevel();
  } else {
    document.getElementById("stars").className = "";
    document.getElementById("tasks").className = "shaky";
    answerElm.placeholder = answerElm.value + " er ikke riktig";
    answerElm.value = "";
  }
}

function createNormalMultiplicationTask(div, num1, num2, answer) {
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
          "data-question": num1 + ' * ' + num2 + ' = ' + answer,
          autofocus: true
        }),
        elm("button", { type: "submit", class: "positive-btn" }, [
          document.createTextNode("✔")
        ])
      ])
    ],
    div
  );
  document.getElementsByName('answer')[0].focus();
}

function createMissingNumMultiplicationTask(div, num1, num2, answer) {
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
          "data-question": num1 + ' * ' + num2 + ' = ' + answer,
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
  document.getElementsByName('answer')[0].focus();
}

function considerUppingLevel() {
  while(timingLog.length > 30) {
    timingLog.shift();
  }
  var total = timingLog
  .reduce(function(total, current){return total + current}, 0);
  var avg = total / timingLog.length;
  console.log(avg);
  if (timingLog.length >= 20 && avg < 4500) {
    level ++;
    timingLog.length = 0;
    params.end = level + 2;
  }
}

window.onload = nextTask;
