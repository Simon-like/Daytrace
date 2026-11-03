import assert from "node:assert/strict";
import test from "node:test";
import {
  parseApiErrorResponse,
  parseRecordDetailResponse,
  parseRecordListResponse,
} from "./index";
import {
  syntheticErrorResponse,
  syntheticRecordDetailResponse,
  syntheticRecordListResponse,
} from "./fixtures";

test("shared runtime contract accepts list, detail and stable errors", () => {
  assert.deepEqual(parseRecordListResponse(syntheticRecordListResponse()), syntheticRecordListResponse());
  assert.deepEqual(parseRecordDetailResponse(syntheticRecordDetailResponse()), syntheticRecordDetailResponse());
  assert.deepEqual(parseApiErrorResponse(syntheticErrorResponse()), syntheticErrorResponse());
});

test("public response parser rejects private data and incompatible shapes", () => {
  const detail = syntheticRecordDetailResponse();
  assert.throws(() => parseRecordDetailResponse({
    ...detail,
    data: { ...detail.data, visibility: "private" },
  }));
  assert.throws(() => parseRecordDetailResponse({
    ...detail,
    data: { ...detail.data, body: { ...detail.data.body, parseRevision: "other" } },
  }));
  assert.throws(() => parseRecordDetailResponse({ ...detail, schemaVersion: "2.0" }));
  assert.throws(() => parseRecordDetailResponse({
    ...detail,
    data: {
      ...detail.data,
      attachments: [{ ...detail.data.attachments[0], url: "/api/v1/assets?path=secret" }],
    },
  }));
  const relatedRecord = syntheticRecordListResponse().data.items[0];
  assert.throws(() => parseRecordDetailResponse({
    ...detail,
    data: {
      ...detail.data,
      relatedRecords: [{ ...relatedRecord, visibility: "private" }],
    },
  }));
});

test("compatible additive response fields remain readable", () => {
  const list = syntheticRecordListResponse();
  const withFutureField = {
    ...list,
    data: { ...list.data, futureOptionalValue: true },
  };
  assert.equal(parseRecordListResponse(withFutureField).data.items.length, 1);
});
