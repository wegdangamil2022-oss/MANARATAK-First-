import { test } from 'vitest';
import assert from 'node:assert/strict';
import {
  COMMUNITY_CHANNELS,
  CATEGORY_SECTIONS,
  CHANNEL_DESIGN_VARIANTS,
  filterCommunityChannels,
  getGroupedCommunityChannels,
  formatArabicOrderNumber,
} from './communityChannelsData';

test('community channels dataset has all 22 official items with valid avatarCode', () => {
  assert.equal(COMMUNITY_CHANNELS.length, 22);
  for (const item of COMMUNITY_CHANNELS) {
    assert.ok(item.title.length > 0, 'Channel title should not be empty');
    assert.ok(item.scopeLabel.length > 0, 'Channel scopeLabel should not be empty');
    assert.ok(item.url.startsWith('https://'), 'Channel url should be valid https link');
    assert.ok(item.avatarCode.length > 0, 'Channel avatarCode should be defined');
  }
});

test('three distinct design variants are configured', () => {
  assert.equal(CHANNEL_DESIGN_VARIANTS.length, 3);
  assert.deepEqual(
    CHANNEL_DESIGN_VARIANTS.map((d) => d.id),
    ['majors-table', 'majors-kv-grid', 'academic-index'],
  );
});

test('filtering and grouping return accurate counts per section', () => {
  assert.equal(filterCommunityChannels('all').length, 22);
  assert.equal(filterCommunityChannels('whatsapp-channels').length, 3);
  assert.equal(filterCommunityChannels('telegram-channels').length, 6);
  assert.equal(filterCommunityChannels('telegram-groups').length, 8);
  assert.equal(filterCommunityChannels('whatsapp-groups').length, 5);

  const allGroups = getGroupedCommunityChannels('all');
  assert.equal(allGroups.length, 4);
  assert.equal(allGroups[0].section.title, CATEGORY_SECTIONS[0].title);
  assert.equal(allGroups[0].items.length, 3);

  const tgGroupsOnly = getGroupedCommunityChannels('telegram-groups');
  assert.equal(tgGroupsOnly.length, 1);
  assert.equal(tgGroupsOnly[0].items.length, 8);
});

test('formatArabicOrderNumber formats 1-based indices as 2-digit Arabic numerals', () => {
  assert.equal(formatArabicOrderNumber(1), '٠١');
  assert.equal(formatArabicOrderNumber(9), '٠٩');
  assert.equal(formatArabicOrderNumber(12), '١٢');
});
