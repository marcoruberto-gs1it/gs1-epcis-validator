export const EXAMPLE_EVENT = `{
  "@context": [
    "https://ref.gs1.org/standards/epcis/2.0.0/epcis-context.jsonld"
  ],
  "type": "EPCISDocument",
  "schemaVersion": "2.0",
  "creationDate": "2026-08-04T14:43:03.64Z",
  "epcisBody": {
    "eventList": [
      {
        "type": "TransformationEvent",
        "eventTime": "2026-08-04T16:30:48+02:00",
        "eventTimeZoneOffset": "+02:00",
        "inputQuantityList": [
          {
            "epcClass": "https://id.gs1.org/01/08032089003629/10/LS122",
            "quantity": 200,
            "uom": "GRM"
          }
        ],
        "outputQuantityList": [
          {
            "epcClass": "https://id.gs1.org/01/08032089003629/10/LS122",
            "quantity": 200,
            "uom": "GRM"
          }
        ],
        "transformationID": "https://id.gs1.org/253/803208900001712345678",
        "bizStep": "creating_class_instance",
        "disposition": "in_progress",
        "readPoint": {
          "id": "https://id.gs1.org/414/8032089001007/254/21"
        },
        "bizLocation": {
          "id": "https://id.gs1.org/414/8032089001007/254/55"
        },
        "ilmd": {
          "gs1:Product": {
            "gs1:productionDate": "2026-10-30",
            "gs1:bestBeforeDate": "2027-04-06"
          }
        }
      }
    ]
  }
}
`;
