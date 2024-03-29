export default function delay(timeInMs) {
  return new Promise((resolve) => {
    setTimeout(() => resolve(), timeInMs);
  });
}
