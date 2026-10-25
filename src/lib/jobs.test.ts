import { describe, it, expect } from 'vitest';
import {
    filterByDepartment,
    filterByLocation,
    filterJobs,
    sortByNewest,
    formatPostedDate,
} from './jobs';
import type { Job } from '../types/job';

/** Creates a job fixture with overrideable department and location values. */
function makeJob(
  slug: string,
  postedDate: string,
  department = 'Technology',
  location = 'Remote',
): Job {
  return {
    slug,
    title: `Role ${slug}`,
    department,
    location,
    type: 'Full-time',
    remote: true,
    postedDate,
    summary: 'A role.',
  };
}

describe('sortByNewest', () => {
  it('orders jobs by posted date, newest first', () => {
    const jobs = [
      makeJob('a', '2027-01-01'),
      makeJob('b', '2027-03-15'),
      makeJob('c', '2027-02-10'),
    ];
    expect(sortByNewest(jobs).map((j) => j.slug)).toEqual(['b', 'c', 'a']);
  });

  it('does not mutate the input array', () => {
    const jobs = [makeJob('a', '2027-01-01'), makeJob('b', '2027-03-15')];
    const original = jobs.map((j) => j.slug);
    sortByNewest(jobs);
    expect(jobs.map((j) => j.slug)).toEqual(original);
  });
});

describe('filterByDepartment', () => {
  it('returns jobs in the selected department', () => {
    const jobs = [
      makeJob('a', '2027-01-01', 'Technology'),
      makeJob('b', '2027-01-02', 'Finance'),
    ];

    expect(filterByDepartment(jobs, 'Finance').map((job) => job.slug)).toEqual(['b']);
  });

  it('returns all jobs for an empty or unknown department without mutating input', () => {
    const jobs = [makeJob('a', '2027-01-01'), makeJob('b', '2027-01-02')];

    expect(filterByDepartment(jobs, '')).toEqual(jobs);
    expect(filterByDepartment(jobs, 'Unknown')).toEqual([]);
    expect(jobs.map((job) => job.slug)).toEqual(['a', 'b']);
  });
});

describe('filterByLocation', () => {
  it('returns jobs in the selected location', () => {
    const jobs = [
      makeJob('a', '2027-01-01', 'Technology', 'Remote'),
      makeJob('b', '2027-01-02', 'Finance', 'Seattle'),
    ];

    expect(filterByLocation(jobs, 'Seattle').map((job) => job.slug)).toEqual(['b']);
  });

  it('returns all jobs for an empty location', () => {
    const jobs = [makeJob('a', '2027-01-01'), makeJob('b', '2027-01-02')];

    expect(filterByLocation(jobs, '')).toEqual(jobs);
  });
});

describe('filterJobs', () => {
  const jobs = [
    makeJob('a', '2027-01-01', 'Technology', 'Remote'),
    makeJob('b', '2027-01-02', 'Technology', 'Seattle'),
    makeJob('c', '2027-01-03', 'Finance', 'Remote'),
  ];

  it('combines department and location filters with AND semantics', () => {
    expect(
      filterJobs(jobs, { department: 'Technology', location: 'Seattle' }).map(
        (job) => job.slug,
      ),
    ).toEqual(['b']);
  });

  it('returns all jobs when both filters are reset', () => {
    expect(filterJobs(jobs, { department: '', location: '' })).toEqual(jobs);
  });

  it('returns no jobs when no role matches both filters', () => {
    expect(filterJobs(jobs, { department: 'Finance', location: 'Seattle' })).toEqual([]);
  });
});

describe('formatPostedDate', () => {
  it('formats an ISO date as a readable string', () => {
    expect(formatPostedDate('2027-01-05')).toBe('January 5, 2027');
  });

  it('returns the raw value when the date is unparseable', () => {
    expect(formatPostedDate('not-a-date')).toBe('not-a-date');
  });
});
