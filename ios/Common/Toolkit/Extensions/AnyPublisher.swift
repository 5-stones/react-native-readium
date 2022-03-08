import Combine

extension AnyPublisher {

  public static func just(_ value: Output) -> Self {
    Just(value)
      .setFailureType(to: Failure.self)
      .eraseToAnyPublisher()
  }

  public static func fail(_ error: Failure) -> Self {
    Fail(error: error).eraseToAnyPublisher()
  }
}
