export type MockType<T> = {
  [P in keyof T]?: T[P] extends (...args: infer A) => infer R
    ? jest.Mock<R, A>
    : T[P];
};
