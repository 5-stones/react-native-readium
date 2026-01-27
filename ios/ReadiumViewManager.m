#import "React/RCTViewManager.h"

@interface RCT_EXTERN_MODULE(ReadiumViewManager, RCTViewManager)

RCT_EXPORT_VIEW_PROPERTY(file, NSDictionary *)
RCT_EXPORT_VIEW_PROPERTY(location, NSDictionary *)
RCT_EXPORT_VIEW_PROPERTY(preferences, NSString *)
RCT_EXPORT_VIEW_PROPERTY(decorations, NSString *)
RCT_EXPORT_VIEW_PROPERTY(selectionActions, NSString *)
RCT_EXPORT_VIEW_PROPERTY(onLocationChange, RCTDirectEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onPublicationReady, RCTDirectEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onDecorationActivated, RCTDirectEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onSelectionAction, RCTDirectEventBlock)

@end
