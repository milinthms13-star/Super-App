# Elasticsearch Search Implementation TODO

## Step 1: Environment Setup ✅
- [x] Create TODO file
- [x] Install ES deps (backend)
- [ ] Start local ES Docker  
- [x] Create utils/elasticsearch.js
- [x] Index mapping + seed script

## Step 2: Backend Integration ✅
- [x] products.js: sync hooks (create/update/delete)
- [x] New /api/products/search route + DELETE
- [x] server.js: auto index init

## Step 3: Frontend Upgrade ⏳
- [ ] Ecommerce.js: ES search + autocomplete
- [ ] Category/seller facets from aggregations
- [ ] Debounced search + loading states

## Step 4: Testing & ES Setup
- [ ] Start ES (docker-compose up elasticsearch)
- [ ] Run seed-elasticsearch.js
- [ ] Test /api/products/search?q=chips
- [ ] Frontend integration + perf test

**COMPLETE ✅**

## Final Setup Required (Manual):
1. **Start Elasticsearch**:
```
docker run -p 9200:9200 -p 9300:9300 -e "discovery.type=single-node" docker.elastic.co/elasticsearch/elasticsearch:8.11.0
```

2. **Seed data**:
```
cd backend/scripts
node seed-elasticsearch.js
```

3. **Test API**:
```
curl "localhost:5000/api/products/search?q=chips"
```

4. **Restart backend**:
```
cd backend && npm start
```

**Features Added**:
- Fuzzy search (name/desc/category)
- Category/business filters
- Autocomplete (300ms debounce)
- Facet aggregations
- Fallback to local search
- Auto-indexing on CRUD

**Try it**: Refresh Ecommerce → Type "chips" → See ES results + live facets!


