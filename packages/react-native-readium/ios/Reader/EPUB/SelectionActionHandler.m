//
//  SelectionActionHandler.m
//  react-native-readium
//

#import "SelectionActionHandler.h"
#import <objc/runtime.h>

@interface SelectionActionHandler ()
@property (nonatomic, strong) NSArray<NSString *> *actionIds;
@end

@implementation SelectionActionHandler

- (instancetype)initWithActionIds:(NSArray<NSString *> *)actionIds {
    self = [super init];
    if (self) {
        _actionIds = actionIds;
        [self setupDynamicMethods];
    }
    return self;
}

- (void)setupDynamicMethods {
    Class class = [self class];

    for (NSString *actionId in self.actionIds) {
        NSString *selectorName = [NSString stringWithFormat:@"handleSelectionAction_%@:", actionId];
        SEL selector = NSSelectorFromString(selectorName);

        // Create the implementation
        IMP implementation = imp_implementationWithBlock(^(id _self, id sender) {
            SelectionActionHandler *handler = (SelectionActionHandler *)_self;
            [handler.delegate handleSelectionActionWithId:actionId];
        });

        // Add the method to the class
        // Method signature: void (id self, SEL _cmd, id sender)
        class_addMethod(class, selector, implementation, "v@:@");
    }
}

- (BOOL)respondsToSelector:(SEL)aSelector {
    NSString *selectorString = NSStringFromSelector(aSelector);
    if ([selectorString hasPrefix:@"handleSelectionAction_"]) {
        return YES;
    }
    return [super respondsToSelector:aSelector];
}

- (UIResponder *)nextResponder {
    // Return the original next responder to continue the chain
    return self.originalNextResponder;
}

@end
