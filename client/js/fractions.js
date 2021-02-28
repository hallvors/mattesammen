/*
Visuell brøk
Client-side code

*/

var theAnswer = null
var completed = false
var level = 1

function init() {
  var div = document.getElementById('tasks')
  div.style.marginTop = '15px'
  div.style.height = '100%';
  var iframe = div.appendChild(document.createElement('iframe'))
  iframe.style.width = iframe.style.height = '100%'
  iframe.style.minHeight = '400px;'
  iframe.src = '/sider/visuellbrok/'
  window.addEventListener(
    'message',
    (event) => {
      if (event.origin !== location.origin) {
        return
      }
      evtHandler(event.data)
    },
    false,
  )
}

function evtHandler(data) {
  if (!theAnswer) {
    return
  }
  var correct = theAnswer.length === data.fractions.length
  if (correct) {
    for (var i = 0; i < theAnswer.length; i++) {
      if (
        !(
          data.fractions[i] &&
          data.fractions[i].numerator === theAnswer[i].numerator &&
          data.fractions[i].denominator === data.fractions[i].denominator
        )
      ) {
        correct = false
      }
    }
  }
  if (correct) {
    socket.emit('correct-answer', {
      level: level,
      classId: classId,
      dataurl: data.dataurl,
    })
    bounceStars()
  }
}

socket.on('new-fraction-task', function (payload) {
  console.log('new-fraction-task', payload)
  if (payload.answer) {
    theAnswer = payload.answer
    completed = false
  }
})

window.onload = init
