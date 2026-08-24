class FliqloCardManager {
  constructor(cardElements, onFlipCallback) {
    this.cards = cardElements;
    this.onFlip = onFlipCallback;
    this.cardTimeouts = new Map();
    this.cardNodes = new Map();
    this.cardValues = new Map(); // In-memory cache to avoid DOM dataset read/writes on every tick

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
        const initialVal = card.getAttribute('data-value') || '00';
        this.cardValues.set(card, initialVal);
      }
    });
  }

  flipCard(cardElement, nextVal) {
    if (!cardElement) return;
    const currentVal = this.cardValues.get(cardElement) || '00';
    if (currentVal === nextVal) return;

    this.cardValues.set(cardElement, nextVal);

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
    
    // Use requestAnimationFrame instead of forced offsetWidth reflow
    requestAnimationFrame(() => {
      cardElement.classList.add('flipping');
    });

    if (this.onFlip) {
      this.onFlip(cardElement);
    }

    const timeout = setTimeout(() => {
      nodes.lower.textContent = nextVal;
      cardElement.classList.remove('flipping');
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
    this.cardValues.set(cardElement, val);
    cardElement.setAttribute('data-value', val);
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
