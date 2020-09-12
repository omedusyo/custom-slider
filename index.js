
// project number down to the interval [0; 1]
// e.g.  round(0.5) == 0.5
//       round(1.5) == 1.0
//       round(-0.5) == 0.0
// round(p : Number): ClosedInterval[0, 1]
function round(p) {
  return Math.max(0, Math.min(p, 1));
}

// example
// the following maps range(0, 4) to range(0, 600)
// var scaleX = linearScale([0, 4], [0, 600]);
function linearScale([a0, a1], [b0, b1]) {
  return x => b0 + (x - a0)/(a1 - a0) * (b1 - b0);
}

// example:
// the following is mode = 'discrete'
//   var slider = Slider({selector: '.slider-container', min: 2, max: 10, N: 20, defaultPosition: 10});
//   slider.subscribe((v, k, p) => {
//     console.log(`val=${v}, pos=${k}, %=${p}`);
//   });
//
// this is continuous mode
//   var slider = Slider({mode: 'continuous', selector: '.slider-container', min: -15.3, max: 15.6, defaultValue: 0});
//
// Consider the slider range of [a..b] := [min..max] divided into N pieces.
// Then the slider can take N + 1 values 
//   { a + 0*stepSize, a + 1*stepSize, a + 2*stepSize, ..., a + N*stepSize}
// where stepSize is determined by
//   a + N*stepSize == b
// hence
//   stepSize := (b - a)/N
//
// note!
//   defaultPosition : [0..N]
// also when mode='discrete', we only use defaultPosition and we don't use defaultValue (and conversely for mode='continuous'):
function Slider({ min, max, N, defaultPosition, defaultValue, selector, mode = 'discrete'}) {
  const stepSize = (max - min)/N;

  // positions are k
  // percentages are p
  // values are x
  function fromPosition2Percentage(k) {
    return k/N;
  }
  function fromPercentage2Position(p) {
    return Math.round(p * N);
  }
  function fromPosition2Value(k) {
    return min + k*stepSize;
  }
  function fromPercentage2Value(p) {
    return linearScale([0, 1], [min, max])(p);
  }
  function fromValue2Percentage(x) {
    return round(x / (max - min));
  }

  const track = document.querySelector(`${selector} .track`);
  const progressBar = document.querySelector(`${selector} .progress`);
  const thumb = document.querySelector(`${selector} .thumb`);
  track.setAttribute('tabindex', '-1');
  thumb.setAttribute('tabindex', '0');

  const State = {
    // progressPercentage: undefined,
    // currentPosition: undefined,
    dragging: false,
    focused: false,

    // mouseReferenceX: undefined,
    // progressPercentageReference: undefined,

    callbacks: [],

    setInitialPosition() {
      switch (mode) {
        case 'discrete':
          this.currentPosition = defaultPosition;
          this.progressPercentage = fromPosition2Percentage(defaultPosition);
          break;
        case 'continuous':
          this.progressPercentage = fromValue2Percentage(defaultValue);
          this.currentPosition = fromPercentage2Position(this.progressPercentage);
          break;
        default:
          throw Error(`Unknown Mode: ${mode}`);
      }

      progressBar.style.width = `${this.progressPercentage * 100}%`;
      thumb.style.left = `${this.progressPercentage * 100}%`;

      this.callbacks.map(f => {
        f(fromPosition2Value(position));
      });

    },
    // Used for discrete change
    setProgressPosition(position) {
      const hasPositionChanged = this.currentPosition != position;
      if (hasPositionChanged) {
        this.currentPosition = position;
        this.progressPercentage = fromPosition2Percentage(position);
        progressBar.style.width = `${this.progressPercentage * 100}%`;
        thumb.style.left = `${this.progressPercentage * 100}%`;

        this.callbacks.map(f => {
          f(fromPosition2Value(this.currentPosition), this.currentPosition, this.progressPercentage);
        });
      }
    },
    // Used for continuous change
    setProgressPercentage(progressPercentage) {
      this.progressPercentage = progressPercentage;
      this.currentPosition = fromPercentage2Position(progressPercentage);
      progressBar.style.width = `${this.progressPercentage * 100}%`;
      thumb.style.left = `${this.progressPercentage * 100}%`;

      this.callbacks.map(f => {
        f(fromPercentage2Value(this.progressPercentage), this.currentPosition, this.progressPercentage);
      });
    },
    setProgress(p) {
      switch (mode) {
        case 'discrete':
          this.setProgressPosition(fromPercentage2Position(p));
          break;
        case 'continuous':
          this.setProgressPercentage(p);
          break;
        default:
          throw Error(`Unknown Mode: ${mode}`);
      }
    },
    subscribe(f) {
      this.callbacks.push(f);
    },
    // for debugging purposes
    // fire(event) {
    //   // EVENTS: 'DRAGGING', '!DRAGGING', 'MOUSE_MOVE', 'LEFT_ARROW', 'RIGHT_ARROW', 'FOCUSED', '!FOCUSED'
    //   console.log(event);
    // }
  };

  //---- Slider setup
  thumb.style.transform = `translate(-${thumb.offsetWidth/2}px)`;

  track.addEventListener('mousedown', function (e) {
    State.selected = true;
    const p = round((e.x - track.offsetLeft)/track.offsetWidth);

    State.setProgress(p);

    // State.fire('DRAGGING');
    State.dragging = true;
    State.mouseReferenceX = e.x;
    State.progressPercentageReference = State.progressPercentage;

    track.classList.add('track-selected');
    progressBar.classList.add('progress-selected');
    thumb.classList.add('thumb-selected');
  });

  document.addEventListener('mouseup', function (e) {
    if (State.dragging) {
      track.classList.remove('track-selected');
      progressBar.classList.remove('progress-selected');
      thumb.classList.remove('thumb-selected');
      // State.fire('!DRAGGING');
    }

    State.dragging = false;
    State.mouseReferenceX = undefined;
    State.progressPercentageReference = undefined;
  });

  document.addEventListener('mousemove', function (e) {
    if (State.dragging) {
      // State.fire('MOUSE_MOVE');
      const deltaP = (e.x - State.mouseReferenceX)/track.offsetWidth;
      const p = round(State.progressPercentageReference + deltaP)
      State.setProgress(p);
    }
  });

  // -- Implementation of Left/Right arrows functionality when the Track is Focused
  const leftArrow = 37;
  const rightArrow = 39;
  track.addEventListener('focusin', function (e) {
    State.focused = true;
    // State.fire('!FOCUS');
  });
  track.addEventListener('focusout', function (e) {
    State.focused = false;
    // State.fire('FOCUS');
  });
  document.addEventListener('keydown', function (e) {
    if (State.focused) {
      if (e.keyCode == leftArrow) {
        State.setProgressPosition(Math.max(State.currentPosition - 1, 0));
        // State.fire('LEFT_ARROW');
      }
      if (e.keyCode == rightArrow) {
        State.setProgressPosition(Math.min(State.currentPosition + 1, N));
        // State.fire('RIGHT_ARROW');
      }
    }
  });

  State.setInitialPosition();
  return State;
}

