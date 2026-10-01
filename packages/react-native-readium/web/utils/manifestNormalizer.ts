/**
 * Normalizes a Readium manifest object to ensure compatibility with the navigator.
 * Handles various inconsistencies in manifest formats:
 * - Converts string properties to arrays where required
 * - Normalizes date formats to ISO 8601
 * - Ensures required properties exist
 */
export function normalizeManifest(manifest: any): any {
  const responseObj = manifest;
  const metadata = responseObj.metadata;

  // Normalize root-level properties
  if (typeof responseObj.conformsTo === 'string') {
    responseObj.conformsTo = [responseObj.conformsTo];
  }
  if (typeof metadata?.conformsTo === 'string') {
    metadata.conformsTo = [metadata.conformsTo];
  }
  if (typeof metadata?.accessMode === 'string') {
    metadata.accessMode = [metadata.accessMode];
  }
  if (typeof metadata?.accessibilityFeature === 'string') {
    metadata.accessibilityFeature = [metadata.accessibilityFeature];
  }
  if (typeof metadata?.accessibilityHazard === 'string') {
    metadata.accessibilityHazard = [metadata.accessibilityHazard];
  }

  // Normalize nested accessibility properties
  const accessibility = metadata?.accessibility;
  if (accessibility) {
    if (typeof accessibility.conformsTo === 'string') {
      accessibility.conformsTo = [accessibility.conformsTo];
    }
    if (typeof accessibility.accessMode === 'string') {
      accessibility.accessMode = [accessibility.accessMode];
    }
    if (typeof accessibility.feature === 'string') {
      accessibility.feature = [accessibility.feature];
    }
    if (typeof accessibility.hazard === 'string') {
      accessibility.hazard = [accessibility.hazard];
    }
  }

  // Normalize date formats
  // Some manifests use JavaScript Date.toString() format instead of ISO 8601
  if (metadata?.modified && typeof metadata.modified === 'string') {
    const date = new Date(metadata.modified);
    if (!isNaN(date.getTime())) {
      metadata.modified = date.toISOString();
    }
  }
  if (metadata?.published && typeof metadata.published === 'string') {
    const date = new Date(metadata.published);
    if (!isNaN(date.getTime())) {
      metadata.published = date.toISOString();
    }
  }

  // Ensure links property exists (required by RWPM spec)
  // Some manifests may have landmarks instead of links
  if (!responseObj.links) {
    // If landmarks exist, convert them to links
    if (responseObj.landmarks && Array.isArray(responseObj.landmarks)) {
      responseObj.links = responseObj.landmarks;
    } else {
      // Otherwise create an empty links array
      responseObj.links = [];
    }
  }

  return responseObj;
}
