import assert from 'node:assert/strict';
import { test } from 'node:test';
import { filterBagItems } from '../src/ui/bag.js';
test('bag filtering and sorting preserve item identity and empty capacity', () => {
  const ore = {key:'ore',name:'Iron ore',n:20};
  const fish = {key:'fish',name:'Salmon',n:2};
  const gear = {key:'gear',name:'Armor',worn:true};
  const list = [fish,ore,gear,null];
  assert.deepEqual(filterBagItems(list,' IRON '),[ore]);
  assert.deepEqual(filterBagItems(list,'missing'),[]);
  assert.deepEqual(filterBagItems(list,'','name'),[gear,ore,fish,null]);
  assert.deepEqual(filterBagItems(list,'','quantity'),[ore,fish,gear,null]);
  assert.deepEqual(filterBagItems(list,'','equipped'),[gear,fish,ore,null]);
  assert.deepEqual(list,[fish,ore,gear,null]);
});
