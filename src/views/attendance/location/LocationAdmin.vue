<template>
  <v-container fluid class="h-full">
    <v-form class="px-3 shadow-sm">
      <v-row class="mt-2">
        <v-col cols="12" sm="6">
          <GMapMap class="w-full h-[400px] mb-4" :center="center" :zoom="mapSize" @click="setCenter($event.latLng.lat(), $event.latLng.lng())">
            <GMapMarker :position="center" />
            <GMapCircle :radius="form.range * 1" :center="center" :options="circleOptions" />
          </GMapMap>
          <v-slider v-model="mapSize" :min="12" :max="22" :step="1" color="orange" label="地圖大小" hide-details />
        </v-col>
        <v-col cols="12" sm="6">
          <v-text-field v-model="form.lat" :readonly="true" type="number" label="經度" />
          <v-text-field v-model="form.lng" :readonly="true" type="number" label="緯度" />
          <v-text-field v-model="form.range" type="number" label="打卡範圍" />
          <!-- <v-text-field v-model="form.address" label="地址" /> -->
          <div data-v-55613c89="" class="v-input v-input--horizontal v-input--center-affix v-input--density-default v-locale--is-ltr v-input--dirty v-text-field">
            <!---->
            <div class="v-input__control">
              <div class="v-field v-field--active v-field--center-affix v-field--dirty v-field--variant-filled v-theme--light v-locale--is-ltr" role="textbox">
                <div class="v-field__overlay"></div>
                <div class="v-field__loader">
                  <div class="v-progress-linear v-theme--light v-locale--is-ltr" role="progressbar" aria-hidden="true" aria-valuemin="0" aria-valuemax="100" style="top: 0px; height: 0px; --v-progress-linear-height: 2px; left: 50%; transform: translateX(-50%)">
                    <!---->
                    <div class="v-progress-linear__background" style="width: 100%"></div>
                    <div class="v-progress-linear__indeterminate">
                      <div class="v-progress-linear__indeterminate long"></div>
                      <div class="v-progress-linear__indeterminate short"></div>
                    </div>
                    <!---->
                  </div>
                </div>
                <!---->
                <div class="v-field__field" data-no-activator="">
                  <label class="v-label v-field-label v-field-label--floating" aria-hidden="true" for="input-99" style=""><!---->地址</label><label class="v-label v-field-label" for="input-99" style=""><!---->地址</label
                  ><!---->
                  <GMapAutocomplete class="v-field__input" aria-describedby="input-60-messages" placeholder="" :restrict-to-countries="['hk']" :value="form.address" @place_changed="setPlace"> </GMapAutocomplete>
                  <!---->
                </div>
                <!----><!---->
                <div class="v-field__outline"><!----><!----></div>
              </div>
            </div>
          </div>
          <br />
          <div class="d-flex align-end flex-column">
            <v-btn color="green-darken-4" dark size="large" class="w-full min-[600px]:w-auto" @click="updateData">
              <v-icon>mdi-map-marker</v-icon>
              更新
            </v-btn>
          </div>
        </v-col>
      </v-row>
    </v-form>
  </v-container>
</template>

<script lang="ts" setup>
  import { dbRef, getRefData } from '@/firebase';
  import { useLoadingStore } from '@/store/loading';
  import { update } from 'firebase/database';
  import { computed, onMounted, reactive, ref } from 'vue';

  const circleOptions = {
    //strokeColor: '#FF0000',
    strokeOpacity: 0.5,
    strokeWeight: 0,
    fillColor: '#FF0000',
    fillOpacity: 0.2,
  };

  const form = reactive({
    lat: 0,
    lng: 0,
    address: '',
    range: 0,
  });

  const mapSize = ref(19);

  const updateData = async () => {
    loadingStore.update(true);
    await update(dbRef('company/location'), form);
    loadingStore.update(false);
  };

  const setCenter = (lat: number, lng: number) => {
    form.lat = lat;
    form.lng = lng;
    fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&location_type=ROOFTOP&result_type=street_address&key=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`)
      .then((res) => res.json())
      .then((value) => {
        if (value.results.length) form.address = value.results[0].formatted_address;
      });
  };

  const setPlace = (place: { formatted_address: string; geometry: { location: { lat: () => number; lng: () => number } } }) => {
    form.address = place.formatted_address;
    form.lat = place.geometry.location.lat();
    form.lng = place.geometry.location.lng();
  };

  const loadingStore = useLoadingStore();
  onMounted(async () => {
    loadingStore.update(true);
    const data = await getRefData('company/location');
    form.lat = data?.lat;
    form.lng = data?.lng;
    form.address = data?.address;
    form.range = data?.range;
    loadingStore.update(false);
  });
  const center = computed(() => {
    return { lat: form.lat, lng: form.lng };
  });
</script>
<style scoped>
  .disabledText {
    background-color: #f6f6f6;
  }
  .pac-target-input:not(:-webkit-autofill) {
    height: 3rem;
  }
</style>
