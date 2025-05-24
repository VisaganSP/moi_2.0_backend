/**
 * Compares before and after objects to find which fields have changed
 * @param before The original object
 * @param after The updated object
 * @returns Array of field names that changed
 */
export const findChangedFields = (before: any, after: any): string[] => {
  const changedFields: string[] = [];
  
  // Get all keys from both objects
  const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);
  
  for (const key of allKeys) {
    // Skip special MongoDB fields
    if (key === '__v' || key === 'updated_at') continue;
    
    // If the field is an object (but not a date or null), recursively check its properties
    if (
      typeof before[key] === 'object' && 
      before[key] !== null && 
      !(before[key] instanceof Date) &&
      typeof after[key] === 'object' && 
      after[key] !== null && 
      !(after[key] instanceof Date)
    ) {
      const nestedChanges = findChangedFields(before[key], after[key]);
      // If nested fields changed, add the parent field name
      if (nestedChanges.length > 0) {
        changedFields.push(key);
      }
    } 
    // For non-object fields, directly compare values
    else if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
      changedFields.push(key);
    }
  }
  
  return changedFields;
};

/**
 * Creates a sanitized copy of an object for storing in edit logs
 * Removes sensitive or unnecessary fields
 * @param obj The object to sanitize
 * @returns Sanitized object
 */
export const sanitizeForEditLog = (obj: any): any => {
  if (!obj) return obj;
  
  const sanitized = { ...obj };
  
  // Remove sensitive or unnecessary fields
  delete sanitized.password;
  delete sanitized.__v;
  
  return sanitized;
};