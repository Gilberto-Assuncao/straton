import { describe, expect, it } from "vitest";
import { parseSiteFilter } from "@/src/features/reports/worked-hours-format";

/**
 * Reading the chosen work locations out of a URL (#77).
 *
 * The manager asked for both shapes — everything for accounting, a chosen few
 * for a client — so the filter is a set from the start. These tests are about
 * what happens to the parameter on the way in, which is where a report page
 * turns a hand-edited URL into a 500 or, worse, into a quietly wrong total.
 */
const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";

describe("parseSiteFilter", () => {
  it("reads a comma-separated list", () => {
    expect(parseSiteFilter(`${A},${B}`)).toEqual([A, B]);
  });

  it("reads repeated parameters, which is how a checkbox form would send them", () => {
    expect(parseSiteFilter([A, B])).toEqual([A, B]);
  });

  it("treats nothing as no filter", () => {
    // Empty, not "the empty selection". The distinction matters downstream: an
    // empty array means every location, so a cleared filter shows the whole
    // company rather than an empty report a manager reads as "nobody worked".
    expect(parseSiteFilter(undefined)).toEqual([]);
    expect(parseSiteFilter("")).toEqual([]);
    expect(parseSiteFilter(",,")).toEqual([]);
  });

  it("drops anything that is not a uuid", () => {
    // The report functions take uuid[]. Passing "; drop table" straight through
    // would be a cast error from Postgres — a 500 on the reports page for what
    // is really just noise in a query string.
    expect(parseSiteFilter(`${A},not-a-uuid,42`)).toEqual([A]);
    expect(parseSiteFilter("'; drop table sites; --")).toEqual([]);
  });

  it("tolerates whitespace around ids", () => {
    expect(parseSiteFilter(` ${A} , ${B} `)).toEqual([A, B]);
  });

  it("deduplicates", () => {
    // The count is shown to the user in the filtered notice, so the same
    // location twice would report "2 work locations" for one.
    expect(parseSiteFilter(`${A},${A}`)).toEqual([A]);
  });

  it("is a parser and not a gate", () => {
    // A well-formed id belonging to another company survives this — and must.
    // What stops it is RLS on the aggregation functions, which are security
    // invoker, so it simply matches no rows. If this function were the thing
    // standing between a manager and someone else's hours, access control would
    // be living in a regex.
    const foreign = "99999999-9999-4999-8999-999999999999";
    expect(parseSiteFilter(foreign)).toEqual([foreign]);
  });
});
