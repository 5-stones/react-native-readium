//
//  SelectionActionHandler.h
//  react-native-readium
//

#import <UIKit/UIKit.h>

NS_ASSUME_NONNULL_BEGIN

@protocol SelectionActionHandlerDelegate <NSObject>
- (void)handleSelectionActionWithId:(NSString *)actionId;
@end

/// Helper class to handle dynamic selection actions using Objective-C runtime
/// This needs to be a UIResponder to be part of the responder chain
@interface SelectionActionHandler : UIResponder

@property (nonatomic, weak) id<SelectionActionHandlerDelegate> delegate;
@property (nonatomic, strong, nullable) UIResponder *originalNextResponder;

- (instancetype)initWithActionIds:(NSArray<NSString *> *)actionIds;

@end

NS_ASSUME_NONNULL_END
