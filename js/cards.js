class FliqloCardManager {
  constructor(cardElements, onFlipCallback) {
    this.cards = cardElements;
    this.onFlip = onFlipCallback;
    this.cardTimeouts = new Map();
    this.cardNodes = new Map();

    this.cacheSubElements();
  }

  cacheSubElements() {
    Object.values(this.cards).forEach(card => {
      if (card) {
        this.cardNodes.set(card, {
          upper: card.querySelector('.upper-card .digit'),
          lower: card.querySelector('.lower-card .digit'),
          flipTop: card.querySelector('.flip-card-top .digit'),
          flipBottom: card.querySelector('.flip-card-bottom .digit'),
        });
      }
    });
  }

  flipCard(cardElement, nextVal) {
    if (!cardElement) return;
    const currentVal = cardElement.dataset.targetValue || cardElement.getAttribute('data-value') || '00';
    if (currentVal === nextVal) return;

    cardElement.dataset.targetValue = nextVal;

    if (this.cardTimeouts.has(cardElement)) {
      clearTimeout(this.cardTimeouts.get(cardElement));
    }

    const nodes = this.cardNodes.get(cardElement);
    if (!nodes) return;

    nodes.upper.textContent = nextVal;
    nodes.lower.textContent = currentVal;
    nodes.flipTop.textContent = currentVal;
    nodes.flipBottom.textContent = nextVal;

    cardElement.classList.remove('flipping');
    void cardElement.offsetWidth;
    cardElement.classList.add('flipping');

    if (this.onFlip) {
      this.onFlip(cardElement);
    }

    const timeout = setTimeout(() => {
      nodes.lower.textContent = nextVal;
      cardElement.classList.remove('flipping');
      cardElement.setAttribute('data-value', nextVal);
      this.cardTimeouts.delete(cardElement);
    }, 700);

    this.cardTimeouts.set(cardElement, timeout);
  }

  setCardInstant(cardElement, val) {
    if (!cardElement) return;
    if (this.cardTimeouts.has(cardElement)) {
      clearTimeout(this.cardTimeouts.get(cardElement));
      this.cardTimeouts.delete(cardElement);
    }
    cardElement.classList.remove('flipping');
    const nodes = this.cardNodes.get(cardElement);
    if (nodes) {
      nodes.upper.textContent = val;
      nodes.lower.textContent = val;
    }
    cardElement.setAttribute('data-value', val);
    cardElement.dataset.targetValue = val;
  }

  updateDisplay(hStr, mStr, sStr) {
    this.flipCard(this.cards.hours, hStr);
    this.flipCard(this.cards.minutes, mStr);
    this.flipCard(this.cards.seconds, sStr);
  }

  setAllInstant(hStr, mStr, sStr) {
    this.setCardInstant(this.cards.hours, hStr);
    this.setCardInstant(this.cards.minutes, mStr);
    this.setCardInstant(this.cards.seconds, sStr);
  }
}

window.FliqloCardManager = FliqloCardManager;
