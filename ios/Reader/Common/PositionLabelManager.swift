import UIKit

final class PositionLabelManager {
  private weak var containerView: UIView?
  private weak var navigatorView: UIView?
  private let totalCountProvider: () async -> Int?
  private let label: UILabel
  private var positionsCount: Int?
  private var positionsLoadingTask: Task<Void, Never>?
  private var lastKnownPosition: Int?
  private var lastKnownProgression: Double?

  init(
    containerView: UIView,
    navigatorView: UIView,
    totalCountProvider: @escaping () async -> Int?
  ) {
    self.containerView = containerView
    self.navigatorView = navigatorView
    self.totalCountProvider = totalCountProvider
    self.label = UILabel()
    setupLabel()
  }

  private func setupLabel() {
    guard let container = containerView, let navigator = navigatorView else { return }
    label.translatesAutoresizingMaskIntoConstraints = false
    label.backgroundColor = .clear
    container.addSubview(label)
    NSLayoutConstraint.activate([
      label.centerXAnchor.constraint(equalTo: container.centerXAnchor),
      label.bottomAnchor.constraint(equalTo: navigator.bottomAnchor, constant: -20)
    ])
    label.font = .systemFont(ofSize: 12)
    label.textColor = .darkGray
  }

  @MainActor
  func update(position: Int?, totalProgression: Double?) {
    lastKnownPosition = position
    lastKnownProgression = totalProgression
    label.text = positionLabelText(position: position, totalProgression: totalProgression)
  }

  private func positionLabelText(position: Int?, totalProgression: Double?) -> String? {
    if let position {
      if let total = positionsCount {
        return "\(position) / \(total)"
      } else {
        loadPositionsCountIfNeeded()
        return "\(position)"
      }
    } else if let progression = totalProgression {
      return "\(progression)%"
    } else {
      return nil
    }
  }

  private func loadPositionsCountIfNeeded() {
    guard positionsCount == nil else { return }
    guard positionsLoadingTask == nil else { return }

    positionsLoadingTask = Task { [weak self] in
      guard let self = self else { return }
      defer { self.positionsLoadingTask = nil }

      guard !Task.isCancelled else { return }

      let total = await self.totalCountProvider()
      guard !Task.isCancelled else { return }

      if let total {
        await MainActor.run {
          self.positionsCount = total
          self.label.text = self.positionLabelText(
            position: self.lastKnownPosition,
            totalProgression: self.lastKnownProgression
          )
        }
      }
    }
  }

  @MainActor
  func setHidden(_ hidden: Bool) {
    label.isHidden = hidden
  }

  @MainActor
  func setColors(textColor: UIColor) {
    label.textColor = textColor
  }

  func cancelLoading() {
    positionsLoadingTask?.cancel()
    positionsLoadingTask = nil
  }
}
