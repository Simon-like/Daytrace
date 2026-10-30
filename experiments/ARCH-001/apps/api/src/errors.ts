export interface ValidationIssue {
  file: string;
  field: string;
  message: string;
}

export class ContentValidationError extends Error {
  constructor(readonly issues: ValidationIssue[]) {
    super("Content validation failed");
    this.name = "ContentValidationError";
  }
}

export class RecordNotFoundError extends Error {
  constructor() {
    super("Record not found");
    this.name = "RecordNotFoundError";
  }
}
