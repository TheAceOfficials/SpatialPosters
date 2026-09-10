fetch('https://api.themoviedb.org/3/tv/1396?append_to_response=watch/providers&api_key=4b2382c23a54d3d24021798363ecbd1c')
  .then(r => r.json())
  .then(data => {
    console.log(JSON.stringify(data['watch/providers']?.results?.US, null, 2))
  })
