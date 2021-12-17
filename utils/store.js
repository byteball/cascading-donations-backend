module.exports = function Store(initial = []) {
  this.data = initial;

  this.update = (data) => {
    this.data = data;
  }

  this.get = () => {
    return this.data;
  }
}