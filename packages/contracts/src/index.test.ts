import assert from "node:assert/strict";
import test from "node:test";
import {
  parseApiErrorResponse,
  parseOwnerRecordDetailResponse,
  parseOwnerRecordListResponse,
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

test("owner response parsers accept private drafts and private related records", () => {
  const list = syntheticRecordListResponse();
  const privateSummary = {
    ...list.data.items[0],
    status: "draft" as const,
    visibility: "private" as const,
  };
  const ownerList = {
    ...list,
    data: { ...list.data, items: [privateSummary] },
  };
  assert.deepEqual(parseOwnerRecordListResponse(ownerList), ownerList);

  const detail = syntheticRecordDetailResponse();
  const ownerDetail = {
    ...detail,
    data: {
      ...detail.data,
      status: "draft" as const,
      visibility: "private" as const,
      relatedRecords: [privateSummary],
    },
  };
  assert.deepEqual(parseOwnerRecordDetailResponse(ownerDetail), ownerDetail);
  assert.throws(() => parseRecordDetailResponse(ownerDetail));
});

test("compatible additive response fields remain readable", () => {
  const list = syntheticRecordListResponse();
  const withFutureField = {
    ...list,
    data: { ...list.data, futureOptionalValue: true },
  };
  assert.equal(parseRecordListResponse(withFutureField).data.items.length, 1);
});

test("public tag response validates its envelope and tag values", async () => {
  const { parsePublicTagsResponse } = await import("./index");
  const payload = { schemaVersion: "1.0", data: { tags: ["公开标签"] }, meta: { requestId: "request-001", contentRevision: `sha256:${"a".repeat(64)}` } };
  assert.deepEqual(parsePublicTagsResponse(payload), payload);
  assert.throws(() => parsePublicTagsResponse({ ...payload, data: { tags: [""] } }));
  assert.throws(() => parsePublicTagsResponse({ ...payload, meta: { ...payload.meta, contentRevision: "invalid" } }));
});
