#import "React/RCTViewManager.h"

@interface RCT_EXTERN_MODULE(ReadiumViewManager, RCTViewManager)

RCT_EXPORT_VIEW_PROPERTY(file, NSDictionary *)
RCT_EXPORT_VIEW_PROPERTY(location, NSDictionary *)
RCT_EXPORT_VIEW_PROPERTY(preferences, NSString *)
RCT_EXPORT_VIEW_PROPERTY(onLocationChange, RCTDirectEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onTableOfContents, RCTDirectEventBlock)

@end
