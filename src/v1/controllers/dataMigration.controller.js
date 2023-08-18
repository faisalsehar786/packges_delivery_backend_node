const axios = require("axios");
const mongoose = require("mongoose");
const ObjectID = mongoose.Types.ObjectId;
const apiResponse = require("../../../helpers/apiResponse");
const FederationModel = require("../models/federation.model");
const OrganisationModel = require("../models/organisation.model");
const OrganisationSportModel = require("../models/organisationSport.model");

let accessToken = '';

const nifDataMigration = async (req, res, next) => {
  try {
    await getNifToken();
    const federationList = await getFederations();
    await sleep();
    const orgList = new Set();
    if (federationList.status === 200) {
      federationList.data.forEach(async (federation) => {
        const federationId = await createFederation(federation);
        console.log("federationId: ", federationId);
        const federationClubList = await getFederationClubs(federation.orgId);
        await sleep();
        federationClubList.data.forEach(async (club) => {
          orgList.add(club.orgId)
          const organisationId = await createOrganisation(club, federationId);
          console.log("organisationId: ", organisationId);
          const clubSportList = await getClubSports(club.orgId);
          await createClubSports(clubSportList?.data, organisationId);
          await sleep();
          return apiResponse.successResponse(
            res,
            "Migreringen er fullført",
            "Migration completed successfully"
          );
        });
        console.log("Total Unique Organisation: ", orgList.size)
      });
      setTimeout(() => {
        console.log("Work Done - Size: ", orgList.size)
      }, 0);
    }
  } catch (err) {
    next(err);
  }
};

const nifDataMigrationForClubSports = async (req, res, next) => {
  try {
    await getNifToken();
    const clubList = await OrganisationModel.find({}, { _id: 1, org_id: 1 })
      .skip(0)
      .limit(400)
      .lean();
    clubList.forEach(async (club) => {
      console.log("organisationId: ", club._id);
      await sleep();
      const clubSportList = await getClubSports(club.org_id);
      await createClubSports(clubSportList?.data, club._id);
      await sleep();
      return apiResponse.successResponse(
        res,
        "Migreringen er fullført",
        "Migration completed successfully"
      );
    });
    setTimeout(() => {
      console.log("Work Done");
    }, 0);
  } catch (err) {
    next(err);
  }
};

const nifDataMigrationForOrganisations = async (req, res, next) => {
  try {
    await getNifToken();
    const federationList = await FederationModel.find(
      {},
      { _id: 1, org_id: 1 }
    );
    federationList.forEach(async (federation) => {
      console.log("federationId: ", federation._id);
      const federationClubList = await getFederationClubs(federation.org_id);
      federationClubList.data.forEach(async (club) => {
        await createOrganisation(club, federation._id);
      });
    });
  } catch (err) {
    next(err);
  }
};

const nifDataMigrationForAllClubs = async (req, res, next) => {
  try {
    await getNifToken();
    const clubList = await getAllClubs();
    clubList.data.forEach(async (club) => {
      const clubId = await createClub(club);
      console.log("clubId: ", clubId);
    });
    setTimeout(() => {
      console.log("Work Done");
    }, 0);
  } catch (err) {
    next(err);
  }
};

const nifContactPersonStats = async (req, res, next) => {
  try {
    await getNifToken();
    const clubList = await OrganisationModel.find({}, { _id: 1, org_id: 1 })
      .skip(7000)
      .limit(1000)
      .lean();
    const lederList = new Set();
    const nestLeder = new Set();
    const combine = new Set();
    const outlier = new Set();
    clubList.forEach(async (club) => {
      console.log("organisationId: ", club._id);
      // sleep();
      const clubContactPerson = await getClubContactPerson(club.org_id);
      let contactPersonExist = false;
      clubContactPerson.data.forEach(user => {
        user?.functions.forEach(role => {
          if (role?.functionTypeName == 'Leder') { lederList.add(role.orgId); contactPersonExist = true;}
          if (role?.functionTypeName == 'Nestleder') { nestLeder.add(role.orgId); contactPersonExist = true; }
          if (role?.functionTypeName == 'Nestleder' || role?.functionTypeName == 'Leder') { combine.add(role.orgId); contactPersonExist = true; }
        });
      });
      if(!contactPersonExist) { outlier.add(club.org_id)}
      console.log("lederList: ", lederList.size);
      console.log("nestLeder: ", nestLeder.size);
      console.log("combine: ", combine.size);
      console.log("outlier: ", outlier.size);
      console.log("outlier List: ", outlier);
    });
    setTimeout(() => {
      console.log("Work Done");
    }, 0);
  } catch (err) {
    next(err);
  }
};

async function getNifToken() {
  const config = {
    method: "post",
    url: process.env.NIF_TOKEN_URL,
    data: {
      client_id: "Stotte",
      client_secret: "5Py4ZKGtGu&1QGI!D6JecS26Znv",
      grant_type: "client_credentials",
      scope: "data_org_read data_org_contactpersons_read",
    },
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
  };
  const authPayload = await axios(config);
  accessToken = authPayload.data.access_token;
}

async function getFederations() {
  const config = {
    method: "get",
    url: `${process.env.NIF_BASE_URL}/organisation/orgtype/2`,
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  };
  const data = await axios(config);
  return data;
}

async function getFederationClubs(federationId) {
  const config = {
    method: "get",
    url: `${process.env.NIF_BASE_URL}/allclubs?OrgId=${federationId}&logo=true`,
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  };
  const data = await axios(config);
  return data;
}

async function getClubSports(clubId) {
  const config = {
    method: "get",
    url: `${process.env.NIF_BASE_URL}/sport/${clubId}`,
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  };
  const data = await axios(config);
  return data;
}

async function createFederation(data) {
  try {
    const federationExist = await FederationModel.findOne({ org_id: data?.orgId });
    if (!federationExist) {
      const federation = new FederationModel({
        org_id: data?.orgId,
        reference_id: data?.referenceId,
        federation_name: data?.federationName,
        abbreviation: data?.abbreviation,
        describing_name: data?.describingName,
        org_type_id: data?.orgTypeId,
        organisation_number: data?.organisationNumber,
        email: data?.email,
        home_page: data?.homePage,
        mobile_phone: data?.mobilePhone,
        address_line1: data?.addressLine1,
        address_line2: data?.addressLine2,
        city: data?.city,
        country: data?.country,
        country_id: data?.countryId,
        post_code: data?.postCode,
        longitude: data?.longitude,
        latitude: data?.latitude,
        location: {
          type: "Point",
          coordinates: [data?.longitude, data?.latitude],
        },
        org_logo_base64: data?.orgLogoBase64,
        members: data?.members,
      });
      await federation.save();
      return federation._id;
    }
    return federationExist._id;
  } catch (err) {
    console.log("Federation Create: ", err.message);
  }
}

async function getAllClubs() {
  const config = {
    method: "get",
    url: `${process.env.NIF_BASE_URL}/allclubs?logo=true`,
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  };
  const data = await axios(config);
  return data;
}

async function getClubContactPerson(org_id) {
  const config = {
    method: "get",
    url: `${process.env.NIF_BASE_URL}/contactpersons?orgid=${org_id}`,
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  };
  const data = await axios(config);
  return data;
}

async function createOrganisation(data, federationId) {
  try {
    const organisationExist = await OrganisationModel.findOne({ org_id: data?.orgId });
    if (!organisationExist) {
      console.log("organisation do not exist:", federationId)
      try {
        const organisation = new OrganisationModel({
          // federation_id: federationId,
          org_id: data?.orgId,
          reference_id: data?.referenceId,
          org_name: data?.orgName,
          abbreviation: data?.abbreviation,
          describing_name: data?.describingName,
          org_type_id: data?.orgTypeId,
          organisation_number: data?.organisationNumber,
          email: data?.email,
          home_page: data?.homePage,
          mobile_phone: data?.mobilePhone,
          address_line1: data?.addressLine1,
          address_line2: data?.addressLine2,
          city: data?.city,
          country: data?.country,
          country_id: data?.countryId,
          post_code: data?.postCode,
          longitude: data?.longitude,
          latitude: data?.latitude,
          location: {
            type: "Point",
            coordinates: [data?.longitude, data?.latitude],
          },
          org_logo_base64: data?.orgLogoBase64,
          members: data?.members,
        });
        await organisation.save();
        return organisation._id;
      } catch (err) {
        console.log("Organisation Create Mongo Error: ", err.message);
      }
    }
    return organisationExist._id;
  } catch (err) {
    console.log("Organisation Create: ", err.message);
  }
}

async function createClub(data) {
  try {
    const organisation = new OrganisationModel({
      org_id: data?.orgId,
      reference_id: data?.referenceId,
      org_name: data?.orgName,
      abbreviation: data?.abbreviation,
      describing_name: data?.describingName,
      org_type_id: data?.orgTypeId,
      organisation_number: data?.organisationNumber,
      email: data?.email,
      home_page: data?.homePage,
      mobile_phone: data?.mobilePhone,
      address_line1: data?.addressLine1,
      address_line2: data?.addressLine2,
      city: data?.city,
      country: data?.country,
      country_id: data?.countryId,
      post_code: data?.postCode,
      longitude: data?.longitude,
      latitude: data?.latitude,
      location: {
        type: "Point",
        coordinates: [data?.longitude, data?.latitude],
      },
      org_logo_base64: data?.orgLogoBase64,
      members: data?.members,
    });
    await organisation.save();
    return organisation._id;
  } catch (err) {
    console.log("Organisation Create Mongo Error: ", err.message);
  }
}

async function createClubSports(clubSportList, organisationId) {
  console.log("clubSportList", JSON.stringify(clubSportList));
  clubSportList.forEach(async (sport) => {
    try {
      const organisationSportExist = await OrganisationSportModel.findOne({ organisation_id: organisationId, nif_sports_category_id: sport.id });
      if (!organisationSportExist) {
        const organisationSport = new OrganisationSportModel({
          nif_sports_category_id: sport?.id,
          organisation_id: organisationId,
          sports_category_name: sport?.name,
          description: sport?.description,
          related_org_id: sport?.relatedOrgId,
          parent_activity_id: sport?.parentActivityId,
          activity_code: sport?.activityCode,
          is_valid_for_reporting: sport?.isValidForReporting,
          is_available_for_bedrift: sport?.isAvailableForBedrift,
          federation_name: sport?.orgNameOwner,
          federation_org_id: sport?.orgId,
          is_main_activity: sport?.isMainActivity,
        });
        await organisationSport.save();
      }
    } catch (err) {
      console.log("Organisation Sport Create: ", err.message);
    }
  });
}

async function createBulkOrganisation(dataList, federationId) {
  try {
    const organisationList = [];
    dataList.forEach((data) => {
      organisationList.push({
        federation_id: federationId,
        org_id: data?.orgId,
        reference_id: data?.referenceId,
        org_name: data?.orgName,
        abbreviation: data?.abbreviation,
        describing_name: data?.describingName,
        org_type_id: data?.orgTypeId,
        organisation_number: data?.organisationNumber,
        email: data?.email,
        home_page: data?.homePage,
        mobile_phone: data?.mobilePhone,
        address_line1: data?.addressLine1,
        address_line2: data?.addressLine2,
        city: data?.city,
        country: data?.country,
        country_id: data?.countryId,
        post_code: data?.postCode,
        longitude: data?.longitude,
        latitude: data?.latitude,
        location: {
          type: "Point",
          coordinates: [data?.longitude, data?.latitude],
        },
        org_logo_base64: data?.orgLogoBase64,
        members: data?.members,
      });
    });
    await OrganisationModel.insertMany(organisationList)
      .then(() => {
        console.log("Data inserted") // Success
      }).catch((error) => {
        console.log(error.message) // Failure
      });
  } catch (err) {
    console.log("Organisation Create: ", err.message);
  }
}

async function sleep() {
  setTimeout(() => {
    console.log("go_to_sleep")
  }, 8000);
}
module.exports = {
  nifDataMigrationForAllClubs,
  nifDataMigration,
  nifDataMigrationForClubSports,
  nifDataMigrationForOrganisations,
  nifContactPersonStats,
};
