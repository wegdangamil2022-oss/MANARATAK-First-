import http from 'http';

function doRequest(url: string) {
  return new Promise<{ status: number, data: any }>((resolve, reject) => {
    http.get(url, {
      headers: {
        'Authorization': 'Bearer your-32-character-admin-token-placeholder'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode || 500, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode || 500, data });
        }
      });
    }).on('error', reject);
  });
}

async function main() {
  const all = await doRequest('http://localhost:3000/api/v1/admin/majors?catalog=true&pageSize=10000');
  console.log(`HTTP Status: ${all.status}`);
  console.log(`Response total: ${all.data.total}`);
  console.log(`Actual items in data array: ${all.data.data?.length}`);
  console.log(`Page: ${all.data.page}, PageSize: ${all.data.pageSize}, TotalPages: ${all.data.totalPages}`);

  const bachelors = await doRequest('http://localhost:3000/api/v1/admin/majors?catalog=true&degreeLevel=BACHELOR&pageSize=10');
  console.log(`Bachelor count (total): ${bachelors.data.total}`);

  const masters = await doRequest('http://localhost:3000/api/v1/admin/majors?catalog=true&degreeLevel=MASTER&pageSize=10');
  console.log(`Master count (total): ${masters.data.total}`);

  const doctorates = await doRequest('http://localhost:3000/api/v1/admin/majors?catalog=true&degreeLevel=DOCTORATE&pageSize=10');
  console.log(`Doctorate count (total): ${doctorates.data.total}`);

  const fellowships = await doRequest('http://localhost:3000/api/v1/admin/majors?catalog=true&degreeLevel=FELLOWSHIP&pageSize=10');
  console.log(`Fellowship count (total): ${fellowships.data.total}`);

  console.log('\nRepresentative Codes:');
  const codes = [
    'MJR-0001', 'MJR-0843', 'MAS-0001', 'MAS-1116',
    'DOC-0001', 'DOC-1114', 'FEL-0001', 'FEL-0329'
  ];

  for (const code of codes) {
    const res = await doRequest(`http://localhost:3000/api/v1/admin/majors?catalog=true&search=${code}`);
    const items = res.data.data || [];
    const item = items.find((x: any) => x.code === code);
    if (!item) {
      console.log(`❌ Missing: ${code}`);
    } else {
      console.log(`✅ Found ${code}: AR="${item.nameAr}", EN="${item.nameEn}", Level="${item.degreeLevel}"`);
    }
  }
}

main().catch(console.error);
